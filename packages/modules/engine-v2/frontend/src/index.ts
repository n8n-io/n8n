// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { EngineV2Module } from './engine-v2.module';
export type { EngineCompatibilityReason } from './engineV2Check';
export {
	findEngineV2Issues,
	groupEngineV2Reasons,
	hasBlockingGroup,
	type EngineV2FindingGroup,
} from './engineV2Findings';
export { confirmEngineV2Switch, type EngineV2SwitchConfirmation } from './confirmEngineV2Switch';
export {
	describeEngineV2Block,
	useEngineV2Compatibility,
	type EngineV2CompatibilityWorkflowSource,
} from './composables/useEngineV2Compatibility';
export { useEngineV2FindingsDialog } from './composables/useEngineV2FindingsDialog';
export { default as EngineV2CompatibilityButton } from './components/EngineV2CompatibilityButton.vue';
export { default as EngineV2CompatibilityDialog } from './components/EngineV2CompatibilityDialog.vue';
