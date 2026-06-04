<script setup lang="ts">
// PROTOTYPE (V3): compact row of service icons. Hover shows "Service · N nodes";
// click opens a menu of that service's real nodes — click one to open its NDV.
import { N8nActionDropdown, N8nTooltip } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import type { NodeIconSource } from '@/app/utils/nodeIcon';

interface ServiceNode {
	id: string;
	name: string;
	iconSource: NodeIconSource | undefined;
}

interface ServiceDisplay {
	label: string;
	iconSource: NodeIconSource | undefined;
	nodes: ServiceNode[];
}

const props = defineProps<{ services: ServiceDisplay[] }>();
const emit = defineEmits<{ 'open-node': [name: string] }>();

function nodeById(service: ServiceDisplay, id: string): ServiceNode | undefined {
	return service.nodes.find((node) => node.id === id);
}

function onSelect(service: ServiceDisplay, id: string) {
	const node = nodeById(service, id);
	if (node) emit('open-node', node.name);
}
</script>

<template>
	<div :class="$style.services" data-test-id="group-card-services">
		<N8nTooltip
			v-for="service in props.services"
			:key="service.label"
			:content="`${service.label} · ${service.nodes.length} ${service.nodes.length === 1 ? 'node' : 'nodes'}`"
			placement="top"
		>
			<div
				:class="$style.serviceWrapper"
				@mousedown.stop
				@click.stop
				@dblclick.stop
				@pointerdown.stop
			>
				<N8nActionDropdown
					:items="service.nodes.map((node) => ({ id: node.id, label: node.name }))"
					trigger="click"
					placement="bottom-start"
					:data-test-id="`group-card-service-${service.label}`"
					@select="(id: string) => onSelect(service, id)"
				>
					<template #activator>
						<button type="button" :class="$style.iconButton" :aria-label="service.label">
							<NodeIcon :icon-source="service.iconSource" :size="20" :shrink="false" />
						</button>
					</template>
					<template #menuItem="item">
						<span :class="$style.menuItem">
							<NodeIcon :icon-source="nodeById(service, item.id)?.iconSource" :size="14" />
							<span :class="$style.menuItemLabel">{{ item.label }}</span>
						</span>
					</template>
				</N8nActionDropdown>
			</div>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.services {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
}

.serviceWrapper {
	display: inline-flex;
}

.iconButton {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	border: none;
	background: transparent;
	border-radius: var(--radius);
	cursor: pointer;
	transition: background-color 0.1s ease-in;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.menuItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.menuItemLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
