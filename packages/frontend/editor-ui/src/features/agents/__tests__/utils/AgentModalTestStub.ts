import { defineComponent } from 'vue';

export const AgentModalTestStub = defineComponent({
	name: 'AgentModal',
	inheritAttrs: false,
	props: {
		open: { type: Boolean, default: true },
		title: { type: String, default: '' },
		editableTitle: { type: Boolean, default: false },
		showBack: { type: Boolean, default: false },
		showFooter: { type: Boolean, default: undefined },
		showCancel: { type: Boolean, default: true },
		bodyFlush: { type: Boolean, default: false },
		busy: { type: Boolean, default: false },
		size: { type: String, default: '2xlarge' },
		trapFocus: { type: Boolean, default: true },
		disableOutsidePointerEvents: { type: Boolean, default: true },
	},
	emits: ['update:open', 'update:title', 'back', 'interactOutside'],
	template: `
		<section
			v-if="open"
			v-bind="$attrs"
			role="dialog"
			:data-busy="busy"
			:data-size="size"
			:data-trap-focus="trapFocus"
			:data-disable-outside-pointer-events="disableOutsidePointerEvents"
			:data-body-flush="bodyFlush"
		>
			<header>
				<button
					v-if="showBack"
					data-testid="agent-modal-back"
					:disabled="busy"
					@click="$emit('back')"
				/>
				<input
					v-if="editableTitle"
					:value="title"
					:disabled="busy"
					data-testid="agent-modal-title-input"
					@input="$emit('update:title', $event.target.value)"
				/>
				<h2 v-else>{{ title }}</h2>
				<slot name="headerActions" />
				<button
					data-testid="dialog-close-button"
					:disabled="busy"
					@click="$emit('update:open', false)"
				/>
			</header>
			<div v-if="!trapFocus" data-testid="nested-credential-focus-scope" />
			<main><slot /></main>
			<footer
				v-if="
					showFooter === true ||
					(showFooter !== false &&
						($slots.footerLeft ||
							$slots.footerBeforeCancel ||
							$slots.footerActions ||
							$slots.footer))
				"
			>
				<slot name="footer">
					<slot name="footerLeft" />
					<div data-testid="agent-modal-footer-actions">
						<slot name="footerBeforeCancel" />
						<button
							v-if="showCancel"
							data-testid="agent-modal-cancel"
							:disabled="busy"
							@click="$emit('update:open', false)"
						>Cancel</button>
						<slot name="footerActions" />
					</div>
				</slot>
			</footer>
		</section>
	`,
});

export const AgentModalMultiStepTestStub = defineComponent({
	name: 'AgentModalMultiStep',
	inheritAttrs: false,
	components: { AgentModalTestStub },
	props: {
		open: { type: Boolean, default: true },
		title: { type: String, default: '' },
		editableTitle: { type: Boolean, default: false },
		showBack: { type: Boolean, default: false },
		showFooter: { type: Boolean, default: undefined },
		showCancel: { type: Boolean, default: true },
		bodyFlush: { type: Boolean, default: false },
		busy: { type: Boolean, default: false },
		size: { type: String, default: '2xlarge' },
		trapFocus: { type: Boolean, default: true },
		disableOutsidePointerEvents: { type: Boolean, default: true },
	},
	emits: ['update:open', 'update:title', 'back', 'interactOutside'],
	template: `
		<AgentModalTestStub
			v-bind="$props"
			v-bind="$attrs"
			@update:open="$emit('update:open', $event)"
			@update:title="$emit('update:title', $event)"
			@back="$emit('back')"
		>
			<template #headerActions><slot name="headerActions" /></template>
			<slot />
			<template #footerLeft><slot name="footerLeft" /></template>
			<template #footerBeforeCancel><slot name="footerBeforeCancel" /></template>
			<template #footerActions><slot name="footerActions" /></template>
			<template #footer><slot name="footer" /></template>
		</AgentModalTestStub>
	`,
});
