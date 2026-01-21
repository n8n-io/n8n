function createExperiment<T extends Record<string, string>>(
	name: string,
	variants: T,
): { name: string } & T;
function createExperiment(name: string): { name: string; control: 'control'; variant: 'variant' };
function createExperiment(name: string, variants?: Record<string, string>) {
	return { name, ...(variants ?? { control: 'control', variant: 'variant' }) } as const;
}

export const CANVAS_ZOOMED_VIEW_EXPERIMENT = createExperiment('canvas_zoomed_view');
export const NDV_IN_FOCUS_PANEL_EXPERIMENT = createExperiment('ndv_in_focus_panel');

export const EXTRA_TEMPLATE_LINKS_EXPERIMENT = createExperiment('034_extra_template_links');

export const TEMPLATE_ONBOARDING_EXPERIMENT = createExperiment('035_template_onboarding', {
	control: 'control',
	variantStarterPack: 'variant-starter-pack',
	variantSuggestedTemplates: 'variant-suggested-templates',
});

export const BATCH_11AUG_EXPERIMENT = createExperiment('37_onboarding_experiments_batch_aug11', {
	control: 'control',
	variantReadyToRun: 'variant-ready-to-run-workflows',
	variantReadyToRun2: 'variant-ready-to-run-workflows_v2',
	variantReadyToRun3: 'variant-ready-to-run-workflows_v3',
});

export const TEMPLATE_RECO_V2 = createExperiment('039_template_onboarding_v2');

export const UPGRADE_PLAN_CTA_EXPERIMENT = createExperiment('054_upgrade_plan_cta');

export const TEMPLATES_DATA_QUALITY_EXPERIMENT = createExperiment('046_templates_data_quality', {
	control: 'control',
	variant1: 'variant-batch-1',
	variant2: 'variant-batch-2',
	variant3: 'variant-batch-3',
});

export const READY_TO_RUN_V2_EXPERIMENT = createExperiment('042_ready-to-run-worfklow_v2', {
	control: 'control',
	variant1: 'variant-1-singlebox',
	variant2: 'variant-2-twoboxes',
});

export const READY_TO_RUN_V2_P3_EXPERIMENT = createExperiment('059_ready-to-run-worfklow_v2-3', {
	control: 'control',
	variant5: 'variant-5',
	variant6: 'variant-6',
});

export const PERSONALIZED_TEMPLATES_V3 = createExperiment('044_template_reco_v3');

export const COLLECTION_OVERHAUL_EXPERIMENT = createExperiment('048_collection_overhaul');

export const TEMPLATE_SETUP_EXPERIENCE = createExperiment('055_template_setup_experience');

export const AI_BUILDER_TEMPLATE_EXAMPLES_EXPERIMENT = createExperiment(
	'056_ai_builder_template_examples',
);

export const EXECUTION_LOGIC_V2_EXPERIMENT = {
	name: '062_execution_logic_v2',
	control: 'control',
	variant: 'variant',
};

export const TAMPER_PROOF_INVITE_LINKS = createExperiment('061_tamper_proof_invite_links');

export const RESOURCE_CENTER_EXPERIMENT = createExperiment('063_resource_center_0', {
	control: 'control',
	variantResources: 'variant-resources',
	variantInspiration: 'variant-inspiration',
});

export const EXPERIMENTS_TO_TRACK = [
	EXTRA_TEMPLATE_LINKS_EXPERIMENT.name,
	TEMPLATE_ONBOARDING_EXPERIMENT.name,
	BATCH_11AUG_EXPERIMENT.name,
	TEMPLATE_RECO_V2.name,
	TEMPLATES_DATA_QUALITY_EXPERIMENT.name,
	READY_TO_RUN_V2_P3_EXPERIMENT.name,
	UPGRADE_PLAN_CTA_EXPERIMENT.name,
	AI_BUILDER_TEMPLATE_EXAMPLES_EXPERIMENT.name,
	TEMPLATE_SETUP_EXPERIENCE.name,
	RESOURCE_CENTER_EXPERIMENT.name,
	EXECUTION_LOGIC_V2_EXPERIMENT.name,
	COLLECTION_OVERHAUL_EXPERIMENT.name,
	TAMPER_PROOF_INVITE_LINKS.name,
];
