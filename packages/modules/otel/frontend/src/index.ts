// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { OtelModule } from './otel.module';
// The shell's Observability overview opens the page and shows whether tracing is on.
export { OTEL_SETTINGS_VIEW } from './otel.constants';
export { useOtelStore } from './otel.store';
