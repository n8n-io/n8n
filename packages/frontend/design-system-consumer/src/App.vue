<script setup lang="ts">
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nCheckbox,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nSpinner,
	N8nTabs,
	N8nTag,
	N8nText,
	N8nTooltip,
	locale,
} from '@n8n/design-system';
import type { ButtonVariant, CalloutTheme, TextSize } from '@n8n/design-system';
import { ref } from 'vue';

// Typed against the package's own exported types, not `any`. A broken `.d.ts`
// fails `pnpm typecheck` here rather than in a consumer's product code.
const themes: CalloutTheme[] = ['info', 'success', 'warning', 'danger'];
const buttonVariants: ButtonVariant[] = [
	'solid',
	'subtle',
	'ghost',
	'outline',
	'destructive',
	'success',
];
const textSize: TextSize = 'medium';

const name = ref('');
const fruit = ref('apple');
const agreed = ref(false);
const tab = ref('overview');

// The barrel exports the locale singleton; calling it proves the module
// initialises outside the editor-ui app context.
const localeSample = locale.t('generic.retry', {});
</script>

<template>
	<main class="harness-page">
		<N8nHeading size="xlarge" bold>@n8n/design-system consumer harness</N8nHeading>
		<N8nText :size="textSize" color="text-light">
			Resolved through the package exports map only. locale.t() returned:
			<code>{{ localeSample }}</code>
		</N8nText>

		<section>
			<N8nHeading size="medium" bold>Buttons</N8nHeading>
			<div class="harness-row">
				<N8nButton
					v-for="variant in buttonVariants"
					:key="variant"
					:variant="variant"
					:label="variant"
				/>
				<N8nButton variant="solid" label="Loading" loading />
				<N8nButton variant="solid" label="Disabled" disabled />
				<N8nIconButton icon="plus" variant="subtle" aria-label="Add" />
			</div>
		</section>

		<section>
			<N8nHeading size="medium" bold>Icons</N8nHeading>
			<div class="harness-row">
				<N8nIcon icon="house" size="large" />
				<N8nIcon icon="triangle-alert" size="large" color="warning" />
				<N8nIcon icon="circle-check" size="large" color="success" />
				<N8nSpinner size="medium" />
				<!-- `anvil` is NOT in the bundled icon set, so it renders only when the app
				     provides a loader from `@n8n/design-system/icons/lucide`. It is the
				     regression case for that entry point. -->
				<N8nIcon icon="anvil" size="xlarge" />
			</div>
		</section>

		<section>
			<N8nHeading size="medium" bold>Form controls</N8nHeading>
			<div class="harness-row">
				<N8nInputLabel label="Name">
					<N8nInput v-model="name" placeholder="Type here" />
				</N8nInputLabel>
				<N8nInputLabel label="Fruit">
					<N8nSelect v-model="fruit">
						<N8nOption value="apple" label="Apple" />
						<N8nOption value="pear" label="Pear" />
					</N8nSelect>
				</N8nInputLabel>
				<N8nCheckbox v-model="agreed" label="I agree" />
			</div>
		</section>

		<section>
			<N8nHeading size="medium" bold>Callouts and feedback</N8nHeading>
			<N8nCallout v-for="theme in themes" :key="theme" :theme="theme">
				A {{ theme }} callout.
			</N8nCallout>
			<N8nNotice content="A notice rendered from dist." />
		</section>

		<section>
			<N8nHeading size="medium" bold>Data display</N8nHeading>
			<N8nTabs
				v-model="tab"
				:options="[
					{ value: 'overview', label: 'Overview' },
					{ value: 'usage', label: 'Usage' },
				]"
			/>
			<div class="harness-row">
				<N8nBadge theme="primary">Badge</N8nBadge>
				<N8nTag text="tag" />
				<N8nTooltip content="Tooltip content">
					<N8nText size="small">Hover me</N8nText>
				</N8nTooltip>
			</div>
			<N8nCard>
				<N8nText size="small">A card body.</N8nText>
			</N8nCard>
			<N8nEmptyState heading="Nothing here" description="An empty state from the package." />
		</section>
	</main>
</template>
