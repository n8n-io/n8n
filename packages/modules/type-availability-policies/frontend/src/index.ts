// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { TypeAvailabilityPoliciesModule } from './type-availability-policies.module';
export { useTypeAvailabilityPoliciesStore } from './type-availability-policies.store';
