<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { buildSampleRequest } from '../runtime-credentials.utils';

const { path } = defineProps<{ path: string }>();

const i18n = useI18n();
const lines = computed(() => buildSampleRequest(path));
</script>

<template>
	<figure v-if="lines.length > 0" :class="$style.sample" data-test-id="runtime-sample-request">
		<N8nText tag="figcaption" size="xsmall" color="text-light" bold>
			{{ i18n.baseText('runtimeCredentials.wizard.sample.title') }}
		</N8nText>
		<pre
			:class="$style.code"
		><code><template v-for="(line, lineIndex) in lines" :key="lineIndex"><span
	v-for="(part, partIndex) in line"
	:key="partIndex"
	:class="part.mark ? $style.mark : undefined"
	:data-mark="part.mark ? 'true' : undefined"
>{{ part.text }}</span>
</template></code></pre>
	</figure>
</template>

<style lang="scss" module>
.sample {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	min-width: 0;
}

.code {
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	overflow-x: auto;
	white-space: pre;
}

.mark {
	border-radius: var(--radius--3xs);
	box-shadow: 0 0 0 var(--spacing--5xs) var(--background--info);
	background-color: var(--background--info);
	color: var(--text-color--info);
	font-weight: var(--font-weight--bold);
}
</style>
