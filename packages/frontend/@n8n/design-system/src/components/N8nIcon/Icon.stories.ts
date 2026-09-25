import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, onUnmounted, ref } from 'vue';

import N8nIcon from './Icon.vue';
import { updatedIconSet, type IconName } from './icons';
import N8nInput from '../N8nInput';
import N8nText from '../N8nText';

const iconNames = (Object.keys(updatedIconSet) as IconName[]).toSorted((a, b) =>
	a.localeCompare(b),
);

const galleryLayout = {
	root: {
		display: 'flex',
		flexDirection: 'column',
		gap: 'var(--spacing--md)',
		width: '100%',
		color: 'var(--text-color)',
	},
	toolbar: {
		display: 'flex',
	},
	search: {
		inlineSize: 'var(--spacing--5xl)',
		maxInlineSize: '100%',
	},
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fill, minmax(var(--spacing--4xl), 1fr))',
		borderBlockStart: 'var(--border)',
		borderInlineStart: 'var(--border)',
	},
	tile: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 'var(--spacing--2xs)',
		minBlockSize: 'var(--spacing--4xl)',
		padding: 'var(--spacing--xs)',
		border: 'none',
		borderBlockEnd: 'var(--border)',
		borderInlineEnd: 'var(--border)',
		borderRadius: '0',
		background: 'transparent',
		color: 'inherit',
		cursor: 'pointer',
		userSelect: 'none',
	},
	label: {
		maxWidth: '100%',
		overflow: 'hidden',
		textAlign: 'center',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	},
} as const;

const meta = {
	title: 'Core/Icon',
	component: N8nIcon,
	argTypes: {
		icon: {
			control: 'select',
			options: iconNames,
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'],
		},
		spin: {
			control: 'boolean',
		},
		color: {
			control: 'select',
			options: [
				'primary',
				'secondary',
				'text-dark',
				'text-base',
				'text-light',
				'text-xlight',
				'danger',
				'success',
				'warning',
				'foreground-dark',
				'foreground-xdark',
			],
		},
		strokeWidth: {
			control: 'number',
		},
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A visual glyph component for representing actions, objects, and states.',
			},
		},
	},
} satisfies Meta<typeof N8nIcon>;

export default meta;
// Icon's name union is too large for StoryObj<typeof meta> in Storybook 10.5.
type Story = StoryObj<typeof N8nIcon>;

const renderIcon: Story['render'] = (args) => ({
	components: { N8nIcon },
	setup() {
		return { args };
	},
	template: '<N8nIcon v-bind="args" />',
});

export const Default: Story = {
	render: (args) => ({
		components: { N8nIcon },
		setup() {
			return { args };
		},
		template: `
			<div
				style="
					display: flex;
					align-items: center;
					justify-content: center;
					width: 14px;
					height: 14px;
					outline: var(--border-width) dashed var(--border-color);
				"
			>
				<N8nIcon v-bind="args" />
			</div>
		`,
	}),
	args: {
		icon: 'check',
		size: 'medium',
		spin: false,
	},
};

export const AllIcons: Story = {
	render: (args) => ({
		components: { N8nIcon, N8nInput, N8nText },
		setup() {
			const COPY_RESET_MS = 1500;
			const query = ref('');
			const copiedName = ref<IconName | null>(null);
			let copyTimeout: ReturnType<typeof setTimeout> | undefined;
			const canHover =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(hover: hover)').matches;

			const icons = computed(() => {
				const normalizedQuery = query.value.trim().toLowerCase();
				if (!normalizedQuery) {
					return iconNames;
				}

				return iconNames.filter((name) => name.includes(normalizedQuery));
			});

			const copyName = async (name: IconName) => {
				try {
					await navigator.clipboard.writeText(name);
				} catch {
					return;
				}

				copiedName.value = name;

				if (copyTimeout) {
					clearTimeout(copyTimeout);
				}

				copyTimeout = setTimeout(() => {
					if (copiedName.value === name) {
						copiedName.value = null;
					}
				}, COPY_RESET_MS);
			};

			const setTileHover = (event: MouseEvent, hovering: boolean) => {
				if (!canHover) {
					return;
				}

				const target = event.currentTarget;
				if (!(target instanceof HTMLElement)) {
					return;
				}

				target.style.background = hovering ? 'var(--background--hover)' : 'transparent';
			};

			onUnmounted(() => {
				if (copyTimeout) {
					clearTimeout(copyTimeout);
				}
			});

			return {
				args,
				galleryLayout,
				query,
				copiedName,
				icons,
				copyName,
				setTileHover,
			};
		},
		template: `
			<div :style="galleryLayout.root">
				<form :style="galleryLayout.toolbar" @submit.prevent>
					<N8nInput
						v-model="query"
						:style="galleryLayout.search"
						size="small"
						placeholder="Search icons"
						clearable
						autocomplete="off"
						aria-label="Search icons"
					>
						<template #prefix>
							<N8nIcon icon="search" size="small" />
						</template>
					</N8nInput>
				</form>

				<div v-if="icons.length" :style="galleryLayout.grid">
					<button
						v-for="name in icons"
						:key="name"
						type="button"
						:style="galleryLayout.tile"
						:aria-label="'Copy ' + name"
						:title="name"
						@click="copyName(name)"
						@mouseenter="setTileHover($event, true)"
						@mouseleave="setTileHover($event, false)"
					>
						<N8nIcon
							:icon="name"
							:size="args.size"
							:color="args.color"
							:spin="args.spin"
							:stroke-width="args.strokeWidth"
						/>
						<N8nText :style="galleryLayout.label" size="xsmall" color="text-light">
							{{ copiedName === name ? 'Copied' : name }}
						</N8nText>
					</button>
				</div>
				<N8nText v-else size="small" color="text-light">No icons match "{{ query }}"</N8nText>
			</div>
		`,
	}),
	args: {
		size: 'large',
		spin: false,
	},
	argTypes: {
		icon: { control: false },
	},
	parameters: {
		docs: {
			description: {
				story: 'Browse every current icon. Click a tile to copy its name.',
			},
		},
	},
};

export const WithColor: Story = {
	args: {
		icon: 'check',
		color: 'success',
	},
	render: renderIcon,
};

export const WithCustomSize: Story = {
	args: {
		icon: 'info',
		size: 32,
	},
	render: renderIcon,
};

export const WithSpin: Story = {
	args: {
		icon: 'spinner',
		spin: true,
	},
	render: renderIcon,
};

export const WithStrokeWidth: Story = {
	args: {
		icon: 'circle',
		strokeWidth: 3,
	},
	render: renderIcon,
};

export const Sizes: Story = {
	args: {
		icon: 'info',
	},
	render: () => ({
		components: { N8nIcon },
		template: `
			<div style="display: flex; align-items: flex-start; gap: var(--spacing--sm);">
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="xsmall" />
					<span style="font-size: var(--font-size--2xs);">xsmall</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="small" />
					<span style="font-size: var(--font-size--2xs);">small</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="medium" />
					<span style="font-size: var(--font-size--2xs);">medium</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="large" />
					<span style="font-size: var(--font-size--2xs);">large</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="xlarge" />
					<span style="font-size: var(--font-size--2xs);">xlarge</span>
				</div>
			</div>
		`,
	}),
};

export const Variants: Story = {
	args: {
		icon: 'circle',
	},
	render: () => ({
		components: { N8nIcon },
		template: `
			<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing--sm);">
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="primary" size="large" />
					<span style="font-size: var(--font-size--2xs);">primary</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="secondary" size="large" />
					<span style="font-size: var(--font-size--2xs);">secondary</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="text-dark" size="large" />
					<span style="font-size: var(--font-size--2xs);">text-dark</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="text-base" size="large" />
					<span style="font-size: var(--font-size--2xs);">text-base</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="text-light" size="large" />
					<span style="font-size: var(--font-size--2xs);">text-light</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="text-xlight" size="large" />
					<span style="font-size: var(--font-size--2xs);">text-xlight</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="danger" size="large" />
					<span style="font-size: var(--font-size--2xs);">danger</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="success" size="large" />
					<span style="font-size: var(--font-size--2xs);">success</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="warning" size="large" />
					<span style="font-size: var(--font-size--2xs);">warning</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="foreground-dark" size="large" />
					<span style="font-size: var(--font-size--2xs);">foreground-dark</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="foreground-xdark" size="large" />
					<span style="font-size: var(--font-size--2xs);">foreground-xdark</span>
				</div>
			</div>
		`,
	}),
};
