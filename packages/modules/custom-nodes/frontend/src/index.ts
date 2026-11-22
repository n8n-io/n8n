// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { CUSTOM_NODES_MODULE_ID } from './custom-nodes.constants';
export { CustomNodesModule } from './custom-nodes.module';
export { useCustomNodesStore } from './custom-nodes.store';
export { default as CustomActionWizardModal } from './wizard/CustomActionWizardModal.vue';
export type { CustomActionWizardData } from './wizard/wizard.types';
export {
	useCustomActionSelection,
	type CustomActionPinValues,
} from './selection/useCustomActionSelection';
export { useCustomNodeEntryPoints } from './entry-points/useCustomNodeEntryPoints';
export { default as CreateCustomNodeEntry } from './entry-points/CreateCustomNodeEntry.vue';
export { default as AddCustomActionEntry } from './entry-points/AddCustomActionEntry.vue';
