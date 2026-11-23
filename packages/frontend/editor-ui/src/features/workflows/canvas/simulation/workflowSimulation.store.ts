import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { INode } from 'n8n-workflow';

import { useRootStore } from '@n8n/stores/useRootStore';
import {
	checkWorkflowSimulationSupport,
	runWorkflowSimulation,
	type AvailableVendorInfo,
	type MissingCredentialInfo,
	type SimulateWorkflowRequestPayload,
	type SimulationSeedCollection,
	type SimulationSeedField,
	type SimulationSeedSchema,
	type UnsupportedNodeInfo,
	type WorkflowSimulationResponse,
} from './simulation.api';

export interface VendorSeedState {
	settings: Record<string, unknown>;
	collections: Record<string, Array<Record<string, unknown>>>;
	rawJson: string;
}

export interface SimulationPresetVendorSnapshot {
	settings?: Record<string, unknown>;
	collections?: Record<string, Array<Record<string, unknown>>>;
	rawJson?: string;
}

export interface SimulationPreset {
	id: string;
	labelKey?: string;
	descriptionKey?: string;
	label?: string;
	description?: string;
	isCustom?: boolean;
	vendors: Record<string, SimulationPresetVendorSnapshot>;
	faults?: Record<string, boolean>;
}

const CUSTOM_SCENARIOS_STORAGE_KEY_PREFIX = 'n8n.aiGym.customScenarios.';
export const SIMULATED_EXECUTION_ID_PREFIX = 'ai-gym-sim-';

export function isSimulatedExecutionId(executionId: string | undefined | null): boolean {
	return typeof executionId === 'string' && executionId.startsWith(SIMULATED_EXECUTION_ID_PREFIX);
}

export const SIMULATION_PRESETS: SimulationPreset[] = [
	{
		id: 'sev1-incident',
		labelKey: 'nodeView.simulate.presets.sev1.label',
		descriptionKey: 'nodeView.simulate.presets.sev1.description',
		vendors: {
			slack: {
				settings: { 'workspace.name': 'Acme Corp' },
				collections: {
					channels: [
						{ id: 'C01ALERTS01', name: 'alerts', is_private: false, topic: 'Production alerts' },
						{
							id: 'C01TRIAGE01',
							name: 'triage',
							is_private: false,
							topic: 'Incoming triage queue',
						},
						{ id: 'C01EXECOPS1', name: 'exec-updates', is_private: true, topic: 'P1 escalations' },
					],
					users: [
						{ id: 'U01ALICE001', name: 'alice', real_name: 'Alice Chen', email: 'alice@acme.test' },
						{ id: 'U01BOB00002', name: 'bob', real_name: 'Bob Patel', email: 'bob@acme.test' },
					],
					messages: [
						{
							channel: 'C01ALERTS01',
							ts: '1700000001.000100',
							user: 'U01ALICE001',
							text: '[SEV1] Checkout API 5xx rate jumped to 18% in us-east-1',
						},
						{
							channel: 'C01ALERTS01',
							ts: '1700000002.000200',
							user: 'U01BOB00002',
							text: '[SEV2] Webhook retry queue backed up by 250 jobs',
						},
					],
				},
			},
			github: {
				collections: {
					repositories: [
						{ owner: 'acme', name: 'checkout-service' },
						{ owner: 'acme', name: 'platform-ops' },
					],
					issues: [
						{
							owner: 'acme',
							repo: 'checkout-service',
							title: 'Elevated 502 errors on /v2/checkout',
							body: 'Observed intermittently after deploy #418.',
						},
					],
				},
			},
			linear: {
				settings: {
					workspace_name: 'Acme Engineering',
					url_key: 'acme',
					team_key: 'ENG',
					team_name: 'Engineering',
				},
				collections: {
					issues: [
						{
							title: 'Investigate payment gateway timeout spikes',
							description: 'P99 latency crossed 4.5s during peak load.',
							priority: 1,
						},
						{
							title: 'Add circuit breaker for Stripe webhook retries',
							description: 'Prevent retry storms from exhausting worker pool.',
							priority: 2,
						},
					],
				},
			},
			gmail: {
				settings: { domain: 'acme.test' },
				collections: {
					messages: [
						{
							to: 'oncall@acme.test',
							subject: '[Alert] Checkout API SLO burn rate > 5x',
							body: 'Automated monitor triggered for us-east-1 checkout cluster.',
						},
					],
				},
			},
		},
	},
	{
		id: 'normal-ops',
		labelKey: 'nodeView.simulate.presets.normal.label',
		descriptionKey: 'nodeView.simulate.presets.normal.description',
		vendors: {
			slack: {
				settings: { 'workspace.name': 'Acme Corp' },
				collections: {
					channels: [
						{ id: 'C01ALERTS01', name: 'alerts', is_private: false, topic: 'Production alerts' },
						{ id: 'C01OPS00001', name: 'ops', is_private: false, topic: 'Operations updates' },
					],
					users: [
						{ id: 'U01ALICE001', name: 'alice', real_name: 'Alice Chen', email: 'alice@acme.test' },
					],
					messages: [
						{
							channel: 'C01ALERTS01',
							ts: '1700000010.000100',
							user: 'U01ALICE001',
							text: '[INFO] Nightly database backup completed in 4m 12s',
						},
						{
							channel: 'C01ALERTS01',
							ts: '1700000011.000100',
							user: 'U01ALICE001',
							text: '[INFO] All regional health checks green',
						},
					],
				},
			},
			github: {
				collections: {
					repositories: [{ owner: 'acme', name: 'checkout-service' }],
					issues: [],
				},
			},
			linear: {
				settings: {
					workspace_name: 'Acme Engineering',
					url_key: 'acme',
					team_key: 'ENG',
					team_name: 'Engineering',
				},
				collections: {
					issues: [],
				},
			},
			gmail: {
				settings: { domain: 'acme.test' },
				collections: {
					messages: [],
				},
			},
		},
	},
	{
		id: 'clean-slate',
		labelKey: 'nodeView.simulate.presets.clean.label',
		descriptionKey: 'nodeView.simulate.presets.clean.description',
		vendors: {
			slack: {
				settings: { 'workspace.name': 'Test Workspace' },
				collections: { channels: [], users: [], messages: [] },
			},
			github: {
				collections: { repositories: [], issues: [] },
			},
			linear: {
				settings: {
					workspace_name: 'Test Workspace',
					url_key: 'test',
					team_key: 'ENG',
					team_name: 'Engineering',
				},
				collections: { issues: [] },
			},
			gmail: {
				settings: { domain: 'example.com' },
				collections: { messages: [] },
			},
		},
	},
];

function createDefaultFieldValue(field: SimulationSeedField): unknown {
	if (field.defaultValue !== undefined) {
		return field.defaultValue;
	}
	if (field.type === 'boolean') return false;
	if (field.type === 'number') return 0;
	if (field.type === 'select') return field.options?.[0]?.value ?? '';
	return '';
}

function createEmptyItemForCollection(
	collection: SimulationSeedCollection,
): Record<string, unknown> {
	const item: Record<string, unknown> = {};
	for (const field of collection.fields) {
		item[field.key] = createDefaultFieldValue(field);
	}
	return item;
}

function cloneRecord(rec: Record<string, unknown>): Record<string, unknown> {
	return JSON.parse(JSON.stringify(rec)) as Record<string, unknown>;
}

function loadCustomScenarios(workflowId: string): SimulationPreset[] {
	if (!workflowId || typeof window === 'undefined' || !window.localStorage) {
		return [];
	}
	try {
		const raw = window.localStorage.getItem(`${CUSTOM_SCENARIOS_STORAGE_KEY_PREFIX}${workflowId}`);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(
				(item): item is SimulationPreset =>
					Boolean(item) &&
					typeof item === 'object' &&
					typeof (item as SimulationPreset).id === 'string' &&
					typeof (item as SimulationPreset).label === 'string',
			)
			.map((item) => ({ ...item, isCustom: true }));
	} catch {
		return [];
	}
}

function saveCustomScenarios(workflowId: string, scenarios: SimulationPreset[]): void {
	if (!workflowId || typeof window === 'undefined' || !window.localStorage) {
		return;
	}
	try {
		window.localStorage.setItem(
			`${CUSTOM_SCENARIOS_STORAGE_KEY_PREFIX}${workflowId}`,
			JSON.stringify(scenarios),
		);
	} catch {
		// Ignore localStorage quota or sandbox errors
	}
}

export const useWorkflowSimulationStore = defineStore('workflowSimulation', () => {
	const rootStore = useRootStore();

	const isSimulating = ref(false);
	const isCheckingSupport = ref(false);
	const currentWorkflowId = ref<string>('');
	const activePresetId = ref<string>('sev1-incident');
	const customScenarios = ref<SimulationPreset[]>([]);
	const supported = ref(true);
	const unsupportedNodes = ref<UnsupportedNodeInfo[]>([]);
	const missingCredentials = ref<MissingCredentialInfo[]>([]);
	const requiredVendors = ref<string[]>([]);
	const availableVendors = ref<AvailableVendorInfo[]>([]);
	const lastResult = ref<WorkflowSimulationResponse | null>(null);
	const lastError = ref<string | null>(null);

	const vendorStates = reactive<Record<string, VendorSeedState>>({});
	const faults = reactive<Record<string, boolean>>({});

	const allPresets = computed<SimulationPreset[]>(() => [
		...SIMULATION_PRESETS,
		...customScenarios.value,
	]);

	const canSimulate = computed(() => supported.value);

	const unsupportedNodesByName = computed(() => {
		const map = new Map<string, UnsupportedNodeInfo>();
		for (const item of unsupportedNodes.value) {
			map.set(item.nodeName, item);
		}
		return map;
	});

	const missingCredentialsByNode = computed(() => {
		const map = new Map<string, MissingCredentialInfo[]>();
		for (const item of missingCredentials.value) {
			const existing = map.get(item.nodeName) ?? [];
			existing.push(item);
			map.set(item.nodeName, existing);
		}
		return map;
	});

	const activeVendorsMetadata = computed<AvailableVendorInfo[]>(() => {
		const bySlug = new Map(availableVendors.value.map((v) => [v.slug, v]));
		return requiredVendors.value.map(
			(slug) =>
				bySlug.get(slug) ?? {
					slug,
					hosts: [],
					faultFlags: [],
				},
		);
	});

	function ensureVendorState(slug: string, schema?: SimulationSeedSchema): VendorSeedState {
		if (!vendorStates[slug]) {
			const settings: Record<string, unknown> = {};
			const collections: Record<string, Array<Record<string, unknown>>> = {};

			if (schema) {
				for (const field of schema.settings) {
					settings[field.key] = createDefaultFieldValue(field);
				}
				for (const col of schema.collections) {
					collections[col.key] = [];
				}
			}

			vendorStates[slug] = {
				settings,
				collections,
				rawJson: '{}',
			};

			// Seed from the active preset if this vendor has a preset entry
			const preset = allPresets.value.find((p) => p.id === activePresetId.value);
			const presetVendor = preset?.vendors[slug];
			if (presetVendor) {
				if (presetVendor.settings) {
					for (const [k, v] of Object.entries(presetVendor.settings)) {
						vendorStates[slug].settings[k] = v;
					}
				}
				if (presetVendor.collections) {
					for (const [k, items] of Object.entries(presetVendor.collections)) {
						vendorStates[slug].collections[k] = items.map(cloneRecord);
					}
				}
				if (presetVendor.rawJson) {
					vendorStates[slug].rawJson = presetVendor.rawJson;
				}
			}
		} else if (schema) {
			// Ensure any schema keys that appeared later are initialized
			for (const field of schema.settings) {
				if (!(field.key in vendorStates[slug].settings)) {
					vendorStates[slug].settings[field.key] = createDefaultFieldValue(field);
				}
			}
			for (const col of schema.collections) {
				if (!(col.key in vendorStates[slug].collections)) {
					vendorStates[slug].collections[col.key] = [];
				}
			}
		}

		return vendorStates[slug];
	}

	function getVendorSchema(slug: string): SimulationSeedSchema | undefined {
		return availableVendors.value.find((v) => v.slug === slug)?.seedSchema;
	}

	function getVendorState(slug: string): VendorSeedState {
		return ensureVendorState(slug, getVendorSchema(slug));
	}

	function isNodeUnsupported(nodeName: string): boolean {
		return unsupportedNodesByName.value.has(nodeName);
	}

	function getUnsupportedNodeReason(nodeName: string): string | undefined {
		return unsupportedNodesByName.value.get(nodeName)?.reason;
	}

	function getUnsupportedReasonForNode(nodeName: string): string | undefined {
		return getUnsupportedNodeReason(nodeName);
	}

	function snapshotCurrentState(): {
		vendors: Record<string, SimulationPresetVendorSnapshot>;
		faults: Record<string, boolean>;
	} {
		const vendorsSnapshot: Record<string, SimulationPresetVendorSnapshot> = {};
		const slugs = new Set<string>([...requiredVendors.value, ...Object.keys(vendorStates)]);
		for (const slug of slugs) {
			const state = vendorStates[slug];
			if (!state) continue;
			const collectionsCopy: Record<string, Array<Record<string, unknown>>> = {};
			for (const [colKey, items] of Object.entries(state.collections)) {
				collectionsCopy[colKey] = items.map(cloneRecord);
			}
			vendorsSnapshot[slug] = {
				settings: cloneRecord(state.settings),
				collections: collectionsCopy,
				rawJson: state.rawJson,
			};
		}

		const faultsSnapshot: Record<string, boolean> = {};
		for (const [k, v] of Object.entries(faults)) {
			if (v) {
				faultsSnapshot[k] = true;
			}
		}
		return { vendors: vendorsSnapshot, faults: faultsSnapshot };
	}

	function applyPreset(presetId: string) {
		const preset = allPresets.value.find((p) => p.id === presetId);
		if (!preset) return;
		activePresetId.value = preset.id;

		const slugsToReset = new Set<string>([
			...Object.keys(vendorStates),
			...requiredVendors.value,
			...Object.keys(preset.vendors),
		]);

		for (const slug of slugsToReset) {
			const schema = getVendorSchema(slug);
			const settings: Record<string, unknown> = {};
			const collections: Record<string, Array<Record<string, unknown>>> = {};

			if (schema) {
				for (const field of schema.settings) {
					settings[field.key] = createDefaultFieldValue(field);
				}
				for (const col of schema.collections) {
					collections[col.key] = [];
				}
			}

			const presetVendor = preset.vendors[slug];
			if (presetVendor?.settings) {
				for (const [k, v] of Object.entries(presetVendor.settings)) {
					settings[k] = v;
				}
			}
			if (presetVendor?.collections) {
				for (const [k, items] of Object.entries(presetVendor.collections)) {
					collections[k] = items.map(cloneRecord);
				}
			}

			vendorStates[slug] = {
				settings,
				collections,
				rawJson: presetVendor?.rawJson ?? '{}',
			};
		}

		for (const key of Object.keys(faults)) {
			delete faults[key];
		}
		if (preset.faults) {
			for (const [k, v] of Object.entries(preset.faults)) {
				if (v) {
					faults[k] = true;
				}
			}
		}
	}

	function createCustomScenario(
		name: string,
		description: string,
		options?: { cloneCurrentState?: boolean },
	): SimulationPreset {
		const trimmedName = name.trim();
		const trimmedDesc = description.trim();
		const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const snapshot =
			options?.cloneCurrentState === false ? { vendors: {}, faults: {} } : snapshotCurrentState();

		const scenario: SimulationPreset = {
			id,
			label: trimmedName,
			description: trimmedDesc,
			isCustom: true,
			vendors: snapshot.vendors,
			faults: snapshot.faults,
		};

		customScenarios.value = [...customScenarios.value, scenario];
		if (currentWorkflowId.value) {
			saveCustomScenarios(currentWorkflowId.value, customScenarios.value);
		}
		applyPreset(scenario.id);
		return scenario;
	}

	function updateCustomScenario(presetId: string): void {
		const idx = customScenarios.value.findIndex((s) => s.id === presetId);
		if (idx === -1) return;
		const snapshot = snapshotCurrentState();
		const updated: SimulationPreset = {
			...customScenarios.value[idx],
			vendors: snapshot.vendors,
			faults: snapshot.faults,
		};
		const next = [...customScenarios.value];
		next[idx] = updated;
		customScenarios.value = next;
		if (currentWorkflowId.value) {
			saveCustomScenarios(currentWorkflowId.value, customScenarios.value);
		}
	}

	function deleteCustomScenario(presetId: string): void {
		const next = customScenarios.value.filter((s) => s.id !== presetId);
		if (next.length === customScenarios.value.length) return;
		customScenarios.value = next;
		if (currentWorkflowId.value) {
			saveCustomScenarios(currentWorkflowId.value, customScenarios.value);
		}
		if (activePresetId.value === presetId) {
			applyPreset(SIMULATION_PRESETS[0].id);
		}
	}

	function syncWorkflowScenarios(workflowId: string): void {
		if (!workflowId || workflowId === currentWorkflowId.value) return;
		currentWorkflowId.value = workflowId;
		customScenarios.value = loadCustomScenarios(workflowId);
		if (!allPresets.value.some((p) => p.id === activePresetId.value)) {
			activePresetId.value = SIMULATION_PRESETS[0].id;
		}
	}

	function addCollectionItem(slug: string, collection: SimulationSeedCollection) {
		const state = getVendorState(slug);
		if (!state.collections[collection.key]) {
			state.collections[collection.key] = [];
		}
		state.collections[collection.key].push(createEmptyItemForCollection(collection));
	}

	function removeCollectionItem(slug: string, collectionKey: string, index: number) {
		const state = getVendorState(slug);
		const list = state.collections[collectionKey];
		if (list) {
			list.splice(index, 1);
		}
	}

	function getVendorSeedCount(slug: string): number {
		const state = vendorStates[slug];
		if (!state) return 0;
		let count = 0;
		for (const items of Object.values(state.collections)) {
			count += items.length;
		}
		if (count === 0) {
			for (const value of Object.values(state.settings)) {
				if (typeof value === 'string' && value.trim()) count += 1;
			}
		}
		return count;
	}

	async function refreshSupport(workflowId: string, nodes: INode[]) {
		syncWorkflowScenarios(workflowId);
		if (!workflowId || nodes.length === 0) {
			supported.value = true;
			unsupportedNodes.value = [];
			missingCredentials.value = [];
			requiredVendors.value = [];
			return;
		}

		isCheckingSupport.value = true;
		try {
			const response = await checkWorkflowSimulationSupport(
				rootStore.restApiContext,
				workflowId,
				nodes,
			);
			supported.value = response.supported;
			unsupportedNodes.value = response.unsupportedNodes;
			missingCredentials.value = response.missingCredentials ?? [];
			requiredVendors.value = response.requiredVendors;
			availableVendors.value = response.availableVendors;

			for (const slug of response.requiredVendors) {
				ensureVendorState(slug, getVendorSchema(slug));
			}
		} catch {
			// Leave previous state if backend check fails transiently
		} finally {
			isCheckingSupport.value = false;
		}
	}

	function buildSeedsPayload(): Record<
		string,
		Record<string, unknown> | Array<Record<string, unknown>>
	> {
		const seeds: Record<string, Record<string, unknown> | Array<Record<string, unknown>>> = {};

		for (const slug of requiredVendors.value) {
			const state = getVendorState(slug);
			const schema = getVendorSchema(slug);
			const hasStructuredSchema =
				schema && (schema.settings.length > 0 || schema.collections.length > 0);

			if (hasStructuredSchema) {
				const settingsPayload: Record<string, unknown> = {};
				for (const field of schema.settings) {
					const val = state.settings[field.key];
					if (val !== undefined && val !== '') {
						settingsPayload[field.key] = val;
					}
				}
				const collectionsPayload: Record<string, Array<Record<string, unknown>>> = {};
				for (const col of schema.collections) {
					const items = state.collections[col.key] ?? [];
					if (items.length > 0) {
						collectionsPayload[col.key] = items.map(cloneRecord);
					}
				}
				if (Object.keys(settingsPayload).length > 0 || Object.keys(collectionsPayload).length > 0) {
					seeds[slug] = {
						__structured: true,
						settings: settingsPayload,
						collections: collectionsPayload,
					};
				}
			} else {
				const raw = (state.rawJson ?? '').trim();
				if (raw && raw !== '{}') {
					try {
						const parsed: unknown = JSON.parse(raw);
						if (parsed && typeof parsed === 'object') {
							seeds[slug] = parsed as Record<string, unknown> | Array<Record<string, unknown>>;
						}
					} catch {
						// Ignore invalid JSON; surfaced by UI validation
					}
				}
			}
		}

		return seeds;
	}

	function buildFaultsPayload(): Record<string, number> {
		const result: Record<string, number> = {};
		for (const [key, enabled] of Object.entries(faults)) {
			if (enabled) {
				result[key] = 1;
			}
		}
		return result;
	}

	function setFault(vendor: string, flag: string, enabled: boolean) {
		faults[`${vendor}:${flag}`] = enabled;
	}

	function getFault(vendor: string, flag: string): boolean {
		return Boolean(faults[`${vendor}:${flag}`]);
	}

	function getVendorFaultCount(vendor: string): number {
		const prefix = `${vendor}:`;
		return Object.entries(faults).filter(([k, v]) => k.startsWith(prefix) && v).length;
	}

	async function simulate(
		workflowId: string,
		payload: Omit<SimulateWorkflowRequestPayload, 'seeds' | 'faults'> = {},
	): Promise<WorkflowSimulationResponse> {
		isSimulating.value = true;
		lastError.value = null;
		try {
			const response = await runWorkflowSimulation(rootStore.restApiContext, workflowId, {
				...payload,
				seeds: buildSeedsPayload(),
				faults: buildFaultsPayload(),
			});
			lastResult.value = response;
			return response;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			lastError.value = message;
			throw error;
		} finally {
			isSimulating.value = false;
		}
	}

	return {
		isSimulating,
		isCheckingSupport,
		activePresetId,
		allPresets,
		customScenarios,
		supported,
		canSimulate,
		unsupportedNodes,
		missingCredentials,
		missingCredentialsByNode,
		requiredVendors,
		availableVendors,
		activeVendorsMetadata,
		vendorStates,
		faults,
		lastResult,
		lastError,
		isNodeUnsupported,
		getUnsupportedNodeReason,
		getUnsupportedReasonForNode,
		getVendorSchema,
		getVendorState,
		getVendorSeedCount,
		getVendorFaultCount,
		addCollectionItem,
		removeCollectionItem,
		applyPreset,
		createCustomScenario,
		updateCustomScenario,
		deleteCustomScenario,
		syncWorkflowScenarios,
		refreshSupport,
		setFault,
		getFault,
		simulate,
	};
});
