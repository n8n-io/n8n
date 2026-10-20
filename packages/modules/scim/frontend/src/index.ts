// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { ScimModule, isScimUiAvailable } from './scim.module';
export { useScimStore } from './scim.store';
export type { ScimPageState, ScimStatus } from './scim.store';
export type { ScimTransferPick } from './scim.types';
export { SCIM_SETTINGS_VIEW } from './scim.constants';
