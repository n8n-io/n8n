// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { EngineV2Module } from './engine-v2.module';
export type { EngineCompatibilityReason } from './engineV2Check';
export {
	describeEngineV2Block,
	useEngineV2Compatibility,
	type EngineV2CompatibilityWorkflowSource,
} from './composables/useEngineV2Compatibility';
export { default as EngineV2CompatibilityCallout } from './components/EngineV2CompatibilityCallout.vue';
