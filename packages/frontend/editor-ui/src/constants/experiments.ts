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

export const COMMAND_BAR_EXPERIMENT = createExperiment('command_bar');

export const NDV_UI_OVERHAUL_EXPERIMENT = createExperiment('029_ndv_ui_overhaul');

export const WORKFLOW_BUILDER_RELEASE_EXPERIMENT = createExperiment('043_workflow_builder_release');

export const WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT = createExperiment(
	'036_workflow_builder_agent',
);

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

export const PRE_BUILT_AGENTS_EXPERIMENT = createExperiment('038_pre_built_agents');

export const TEMPLATE_RECO_V2 = createExperiment('039_template_onboarding_v2');

export const READY_TO_RUN_V2_EXPERIMENT = createExperiment('042_ready-to-run-worfklow_v2', {
	control: 'control',
	variant1: 'variant-1-singlebox',
	variant2: 'variant-2-twoboxes',
});

export const READY_TO_RUN_V2_PART2_EXPERIMENT = createExperiment('045_ready-to-run-worfklow_v2-2', {
	control: 'control',
	variant3: 'variant-3',
	variant4: 'variant-4',
});

export const PERSONALIZED_TEMPLATES_V3 = createExperiment('044_template_reco_v3');

export const PROJECT_VARIABLES_EXPERIMENT = createExperiment('046_project_variables');

export const COLLECTION_OVERHAUL_EXPERIMENT = createExperiment('048_collection_overhaul');

export const EXPERIMENTS_TO_TRACK = [
	WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT.name,
	WORKFLOW_BUILDER_RELEASE_EXPERIMENT.name,
	EXTRA_TEMPLATE_LINKS_EXPERIMENT.name,
	TEMPLATE_ONBOARDING_EXPERIMENT.name,
	NDV_UI_OVERHAUL_EXPERIMENT.name,
	COLLECTION_OVERHAUL_EXPERIMENT.name,
	BATCH_11AUG_EXPERIMENT.name,
	PRE_BUILT_AGENTS_EXPERIMENT.name,
	TEMPLATE_RECO_V2.name,
	PROJECT_VARIABLES_EXPERIMENT.name,
];
