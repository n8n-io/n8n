import type { ITemplateModule } from '@n8n/rest-api-client/api/templates';
import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type { CanvasModule, CanvasNode } from '../canvas.types';
import { DEFAULT_NODE_SIZE, GRID_SIZE } from '@/app/utils/nodeViewUtils';

// Padding around the nodes within a module
const MODULE_PADDING = GRID_SIZE * 2;
// Extra space at the top for the module header (name + description)
const MODULE_HEADER_HEIGHT = GRID_SIZE * 5;
// Height of collapsed module (just the header)
const MODULE_COLLAPSED_HEIGHT = GRID_SIZE * 5;
// Width of collapsed module
const MODULE_COLLAPSED_WIDTH = GRID_SIZE * 20;

export function useCanvasModules({
	nodes,
	modules,
}: {
	nodes: Ref<CanvasNode[]>;
	modules: Ref<ITemplateModule[]>;
}) {
	// Track collapsed state for each module by name
	const collapsedModules = ref<Set<string>>(new Set());

	const nodesByName = computed(() => {
		const map = new Map<string, CanvasNode>();
		for (const node of nodes.value) {
			if (node.data) {
				map.set(node.data.name, node);
			}
		}
		return map;
	});

	const mappedModules = computed<CanvasModule[]>(() => {
		return modules.value.map((module) => {
			// Find all nodes belonging to this module
			const moduleNodes = module.nodes
				.map((nodeName) => nodesByName.value.get(nodeName))
				.filter((node): node is CanvasNode => node !== undefined);

			const isCollapsed = collapsedModules.value.has(module.name);

			// Calculate bounding box for the module
			const boundingBox = isCollapsed
				? calculateCollapsedBoundingBox(moduleNodes)
				: calculateModuleBoundingBox(moduleNodes);

			return {
				name: module.name,
				description: module.description,
				nodeNames: module.nodes,
				boundingBox,
				collapsed: isCollapsed,
			};
		});
	});

	function calculateModuleBoundingBox(moduleNodes: CanvasNode[]) {
		if (moduleNodes.length === 0) {
			return { x: 0, y: 0, width: 0, height: 0 };
		}

		// Find the bounds of all nodes in the module
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const node of moduleNodes) {
			const nodeX = node.position.x;
			const nodeY = node.position.y;
			// Use default node size for now - could be enhanced to use actual node dimensions
			const nodeWidth = DEFAULT_NODE_SIZE[0];
			const nodeHeight = DEFAULT_NODE_SIZE[1];

			minX = Math.min(minX, nodeX);
			minY = Math.min(minY, nodeY);
			maxX = Math.max(maxX, nodeX + nodeWidth);
			maxY = Math.max(maxY, nodeY + nodeHeight);
		}

		// Add padding and header space, ensuring minimum width matches collapsed state
		const calculatedWidth = maxX - minX + MODULE_PADDING * 2;
		return {
			x: minX - MODULE_PADDING,
			y: minY - MODULE_PADDING - MODULE_HEADER_HEIGHT,
			width: Math.max(calculatedWidth, MODULE_COLLAPSED_WIDTH),
			height: maxY - minY + MODULE_PADDING * 2 + MODULE_HEADER_HEIGHT,
		};
	}

	function calculateCollapsedBoundingBox(moduleNodes: CanvasNode[]) {
		if (moduleNodes.length === 0) {
			return { x: 0, y: 0, width: MODULE_COLLAPSED_WIDTH, height: MODULE_COLLAPSED_HEIGHT };
		}

		// Find the top-left position based on nodes
		let minX = Infinity;
		let minY = Infinity;

		for (const node of moduleNodes) {
			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
		}

		// Position collapsed module at the top-left of where nodes would be
		return {
			x: minX - MODULE_PADDING,
			y: minY - MODULE_PADDING - MODULE_HEADER_HEIGHT,
			width: MODULE_COLLAPSED_WIDTH,
			height: MODULE_COLLAPSED_HEIGHT,
		};
	}

	function toggleModuleCollapsed(moduleName: string) {
		if (collapsedModules.value.has(moduleName)) {
			collapsedModules.value.delete(moduleName);
		} else {
			collapsedModules.value.add(moduleName);
		}
		// Trigger reactivity
		collapsedModules.value = new Set(collapsedModules.value);
	}

	// Get set of node names that should be hidden (belong to collapsed modules)
	const hiddenNodeNames = computed(() => {
		const hidden = new Set<string>();
		for (const module of modules.value) {
			if (collapsedModules.value.has(module.name)) {
				for (const nodeName of module.nodes) {
					hidden.add(nodeName);
				}
			}
		}
		return hidden;
	});

	return {
		modules: mappedModules,
		toggleModuleCollapsed,
		hiddenNodeNames,
	};
}
