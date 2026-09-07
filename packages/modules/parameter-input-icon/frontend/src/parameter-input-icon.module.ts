import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks this component for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const IconParameterInput = async () => await import('./IconParameterInput.vue');

/**
 * Owns the `icon` parameter input.
 *
 * The `parameter-input-` prefix on the id marks a contribution-only module: it has no
 * backend half, so its id is absent from `/rest/module-settings` and it is free to
 * name the contribution point it feeds. A feature module cannot do that — its id has
 * to equal its backend module directory name, because `isModuleActive(id)` tests it.
 *
 * `registerModuleParameterInputs` does not gate on `isModuleActive`, because a
 * parameter input is a render primitive rather than a feature. A gated renderer would
 * leave the field with nothing to draw it.
 */
export const ParameterInputIconModule: FrontendModuleDescription = {
	id: 'parameter-input-icon',
	name: 'Icon Parameter Input',
	description: 'Renders the icon and emoji picker for parameters of type `icon`',
	icon: 'smile',
	parameterInputs: [
		{
			type: 'icon',
			component: IconParameterInput,
			// Every flag stays at its default, which is what keeps today's behaviour:
			// the shell owns expression rendering for `icon` (the built-in branch was
			// guarded by `!isModelValueExpression && !forceShowExpression`), the shell
			// keeps its own from-AI override, and the field stays a drop target.
		},
	],
};
