import {
	AGENT_BUILDER_EXPERIMENT_COHORT as COHORT,
	AGENT_BUILDER_CHAT_WIDTH_EXPERIMENT as WIDTH,
	AGENT_BUILDER_TEST_TOGGLE_EXPERIMENT as TOGGLE,
} from '@/app/constants/experiments';

const experiments = [
	{ name: WIDTH.name, cohort: COHORT.chatWidth, variants: [WIDTH.control, WIDTH.wide] },
	{
		name: TOGGLE.name,
		cohort: COHORT.testToggle,
		variants: [TOGGLE.control, TOGGLE.wide, TOGGLE.current],
	},
];

export function isAgentBuilderExperiment(name: string) {
	return experiments.some((experiment) => experiment.name === name);
}

export function getAgentBuilderExperimentEnrollment(getVariant: (name: string) => unknown) {
	const cohort = getVariant(COHORT.name);
	const experiment = experiments.find((candidate) => candidate.cohort === cohort);
	if (!experiment) return undefined;
	const variant = getVariant(experiment.name);
	if (
		typeof variant !== 'string' ||
		!experiment.variants.some((candidate) => candidate === variant)
	)
		return undefined;
	return { name: experiment.name, variant };
}
