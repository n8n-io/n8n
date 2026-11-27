// The module's public entry for consumers. The shell imports the descriptor from
// `./roles.module` instead, so the boot chunk does not pull in the components below.
export { RolesModule } from './roles.module';
export { useHiddenRoleResources } from './composables/useHiddenRoleResources';
export {
	countGrantedInstancePermissions,
	countInstancePermissions,
} from './instance/instanceRoleScopes';
export { default as CustomRolesUpgradeModal } from './components/CustomRolesUpgradeModal.vue';
export { default as RoleSelectDropdown } from './components/RoleSelectDropdown.vue';
