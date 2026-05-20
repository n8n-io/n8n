<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { N8nButton, N8nInput, N8nSelect, N8nOption, N8nText } from '@n8n/design-system';

import type { InputHint } from '@/features/core/dashboards/dashboards.types';

export type RowEditorColumn = {
	id: string;
	name: string;
	type: 'string' | 'number' | 'boolean' | 'date';
};

export type RowEditorColumnWithHint = RowEditorColumn & {
	inputHint?: InputHint;
	label?: string;
};

type RowValue = string | number | boolean | null;

const props = defineProps<{
	open: boolean;
	mode: 'create' | 'edit';
	columns: RowEditorColumn[];
	hints?: Record<string, InputHint | undefined>;
	labels?: Record<string, string | undefined>;
	initialRow?: Record<string, unknown> | null;
	saving?: boolean;
	error?: string;
}>();

const emit = defineEmits<{
	(e: 'close'): void;
	(e: 'submit', payload: Record<string, RowValue>): void;
}>();

const userColumns = computed(() =>
	props.columns.filter((c) => !['id', 'createdAt', 'updatedAt'].includes(c.name)),
);

function effectiveKind(col: RowEditorColumn): InputHint['kind'] {
	const hint = props.hints?.[col.name];
	if (hint) return hint.kind;
	if (col.type === 'string') return 'text';
	return col.type;
}

function effectiveLabel(col: RowEditorColumn) {
	return props.labels?.[col.name] ?? col.name;
}

const form = reactive<Record<string, RowValue>>({});
const validationErrors = reactive<Record<string, string>>({});

watch(
	() => [props.open, props.initialRow, props.columns],
	() => {
		if (!props.open) return;
		Object.keys(validationErrors).forEach((k) => delete validationErrors[k]);
		for (const col of userColumns.value) {
			const incoming = props.initialRow?.[col.name];
			if (incoming === undefined || incoming === null) {
				form[col.name] = col.type === 'boolean' ? false : '';
			} else if (col.type === 'boolean') {
				form[col.name] = incoming === true || incoming === 'true';
			} else if (col.type === 'number') {
				form[col.name] = Number(incoming);
			} else if (col.type === 'date') {
				const d = new Date(incoming as string | number);
				form[col.name] = Number.isNaN(d.getTime())
					? String(incoming)
					: d.toISOString().slice(0, 10);
			} else {
				form[col.name] = String(incoming);
			}
		}
	},
	{ immediate: true },
);

const localError = ref('');

function coerce(value: RowValue, col: RowEditorColumn): RowValue {
	if (value === '' || value === null) return null;
	switch (col.type) {
		case 'number':
			return typeof value === 'number' ? value : Number(value);
		case 'boolean':
			return value === true || value === 'true';
		case 'date':
			return String(value);
		case 'string':
		default:
			return String(value);
	}
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

function validateColumn(col: RowEditorColumn, value: RowValue): string | null {
	const hint = props.hints?.[col.name];
	const v = value;
	if (hint?.validation?.required && (v === null || v === '' || v === undefined)) {
		return `${effectiveLabel(col)} is required`;
	}
	if (v === null || v === '' || v === undefined) return null;
	const kind = effectiveKind(col);
	if (kind === 'email' && typeof v === 'string' && !EMAIL_RE.test(v)) {
		return `${effectiveLabel(col)} is not a valid email`;
	}
	if (kind === 'url' && typeof v === 'string' && !URL_RE.test(v)) {
		return `${effectiveLabel(col)} is not a valid URL`;
	}
	if (hint?.validation?.pattern && typeof v === 'string') {
		try {
			if (!new RegExp(hint.validation.pattern).test(v)) {
				return `${effectiveLabel(col)} does not match the required pattern`;
			}
		} catch {
			/* ignore bad pattern */
		}
	}
	if (
		hint?.validation?.minLength &&
		typeof v === 'string' &&
		v.length < hint.validation.minLength
	) {
		return `${effectiveLabel(col)} must be at least ${hint.validation.minLength} characters`;
	}
	if (
		hint?.validation?.maxLength &&
		typeof v === 'string' &&
		v.length > hint.validation.maxLength
	) {
		return `${effectiveLabel(col)} must be at most ${hint.validation.maxLength} characters`;
	}
	if (hint?.validation?.min !== undefined && typeof v === 'number' && v < hint.validation.min) {
		return `${effectiveLabel(col)} must be ≥ ${hint.validation.min}`;
	}
	if (hint?.validation?.max !== undefined && typeof v === 'number' && v > hint.validation.max) {
		return `${effectiveLabel(col)} must be ≤ ${hint.validation.max}`;
	}
	return null;
}

function submit() {
	localError.value = '';
	Object.keys(validationErrors).forEach((k) => delete validationErrors[k]);
	const payload: Record<string, RowValue> = {};
	let hasError = false;
	for (const col of userColumns.value) {
		const v = coerce(form[col.name] ?? null, col);
		if (col.type === 'number' && v !== null && Number.isNaN(v as number)) {
			validationErrors[col.name] = `${effectiveLabel(col)} must be a number`;
			hasError = true;
			continue;
		}
		const err = validateColumn(col, v);
		if (err) {
			validationErrors[col.name] = err;
			hasError = true;
			continue;
		}
		payload[col.name] = v;
	}
	if (hasError) return;
	emit('submit', payload);
}

const title = computed(() => (props.mode === 'create' ? 'Add row' : 'Edit row'));

function onFileChange(name: string, event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) {
		form[name] = '';
		return;
	}
	// For v1 we just persist the file name as the cell value. Real upload + URL
	// resolution can be added later; the spec just stores a string.
	form[name] = file.name;
}
</script>

<template>
	<div v-if="open" class="row-editor-backdrop" @click.self="emit('close')">
		<div class="row-editor" role="dialog" aria-modal="true">
			<header class="row-editor__header">
				<N8nText tag="h3" size="medium" bold>{{ title }}</N8nText>
				<N8nButton type="tertiary" size="mini" icon="circle-x" label="" @click="emit('close')" />
			</header>

			<div class="row-editor__body">
				<div v-for="col in userColumns" :key="col.id" class="row-editor__field">
					<label>
						<span class="row-editor__label">
							{{ effectiveLabel(col) }}
							<span class="row-editor__type">{{ effectiveKind(col) }}</span>
							<span v-if="hints?.[col.name]?.validation?.required" class="row-editor__required"
								>*</span
							>
						</span>

						<template v-if="effectiveKind(col) === 'select'">
							<N8nSelect v-model="form[col.name] as string">
								<N8nOption
									v-for="opt in hints?.[col.name]?.options ?? []"
									:key="opt.value"
									:value="opt.value"
									:label="opt.label ?? opt.value"
								/>
							</N8nSelect>
						</template>

						<template
							v-else-if="effectiveKind(col) === 'textarea' || effectiveKind(col) === 'rich-text'"
						>
							<N8nInput
								v-model="form[col.name] as string"
								type="textarea"
								:rows="4"
								:placeholder="hints?.[col.name]?.placeholder"
							/>
						</template>

						<template v-else-if="effectiveKind(col) === 'email'">
							<N8nInput
								v-model="form[col.name] as string"
								type="email"
								:placeholder="hints?.[col.name]?.placeholder ?? 'name@example.com'"
							/>
						</template>

						<template v-else-if="effectiveKind(col) === 'url'">
							<N8nInput
								v-model="form[col.name] as string"
								type="text"
								:placeholder="hints?.[col.name]?.placeholder ?? 'https://…'"
							/>
						</template>

						<template v-else-if="effectiveKind(col) === 'color'">
							<input v-model="form[col.name] as string" type="color" class="row-editor__color" />
						</template>

						<template v-else-if="effectiveKind(col) === 'file'">
							<input
								type="file"
								class="row-editor__file"
								@change="(e) => onFileChange(col.name, e)"
							/>
							<span v-if="form[col.name]" class="row-editor__file-current">
								{{ form[col.name] }}
							</span>
						</template>

						<N8nInput
							v-else-if="col.type === 'number' || effectiveKind(col) === 'number'"
							v-model.number="form[col.name] as number"
							type="number"
							:placeholder="hints?.[col.name]?.placeholder ?? `Enter ${effectiveLabel(col)}`"
						/>

						<N8nInput
							v-else-if="col.type === 'date' || effectiveKind(col) === 'date'"
							v-model="form[col.name] as string"
							type="text"
							:placeholder="hints?.[col.name]?.placeholder ?? 'YYYY-MM-DD'"
						/>

						<N8nSelect
							v-else-if="col.type === 'boolean' || effectiveKind(col) === 'boolean'"
							v-model="form[col.name] as boolean"
						>
							<N8nOption :value="false" label="false" />
							<N8nOption :value="true" label="true" />
						</N8nSelect>

						<N8nInput
							v-else
							v-model="form[col.name] as string"
							:placeholder="hints?.[col.name]?.placeholder ?? `Enter ${effectiveLabel(col)}`"
						/>

						<span v-if="hints?.[col.name]?.helpText" class="row-editor__help">
							{{ hints[col.name]?.helpText }}
						</span>

						<span v-if="validationErrors[col.name]" class="row-editor__field-error">
							{{ validationErrors[col.name] }}
						</span>
					</label>
				</div>

				<div v-if="localError || error" class="row-editor__error">
					{{ localError || error }}
				</div>
			</div>

			<footer class="row-editor__footer">
				<N8nButton type="tertiary" label="Cancel" @click="emit('close')" />
				<N8nButton
					type="primary"
					:loading="saving"
					:label="mode === 'create' ? 'Add row' : 'Save changes'"
					@click="submit"
				/>
			</footer>
		</div>
	</div>
</template>

<style scoped lang="scss">
.row-editor-backdrop {
	position: fixed;
	inset: 0;
	background: var(--color--black-alpha-500);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 200;
	padding: var(--spacing--md);
}

.row-editor {
	background: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--sm);
	width: 100%;
	max-width: 520px;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
	box-shadow: var(--shadow--dark);
}

.row-editor__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.row-editor__body {
	padding: var(--spacing--md);
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.row-editor__field label {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.row-editor__label {
	display: inline-flex;
	gap: var(--spacing--4xs);
	align-items: center;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
}

.row-editor__type {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	font-family: var(--font-family--monospace);
	padding: 1px 6px;
	border-radius: var(--radius--3xs);
	background: var(--color--background--shade-1);
}

.row-editor__required {
	color: var(--color--text--danger);
}

.row-editor__help {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.row-editor__field-error {
	font-size: var(--font-size--3xs);
	color: var(--color--text--danger);
}

.row-editor__color {
	width: 100%;
	height: 32px;
	border-radius: var(--radius--3xs);
	border: 1px solid var(--color--foreground);
	padding: 2px;
}

.row-editor__file {
	font-size: var(--font-size--2xs);
}

.row-editor__file-current {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	font-family: var(--font-family--monospace);
}

.row-editor__error {
	font-size: var(--font-size--2xs);
	color: var(--color--text--danger);
}

.row-editor__footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: 1px solid var(--color--foreground--tint-1);
}
</style>
