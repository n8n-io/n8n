// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { NextNodesInstanceModule } from './next-nodes-instance.module';
export { useNextNodesInstanceStore } from './next-nodes-instance.store';
export { canMakeHttpActions, canOpenNodesSettings } from './next-nodes-instance.access';
export {
	HTTP_ACTION_VIEW,
	NODES_SETTINGS_INSTALLED_TAB,
	NODES_SETTINGS_VIEW,
} from './next-nodes-instance.constants';
export {
	httpActionFormOfRequest,
	saveHttpActionDraft,
	startHttpActionDraft,
} from './next-nodes-instance.request';
