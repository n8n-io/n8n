import { MakeRoleMappingRuleRoleNullable1784556173999 as BaseMigration } from '../common/1784556173999-MakeRoleMappingRuleRoleNullable';

/**
 * Altering nullability recreates the table on SQLite. `role_mapping_rule` is
 * referenced by `role_mapping_rule_project` with ON DELETE CASCADE, so run
 * with FKs disabled to keep the cascade from wiping the join table.
 */
export class MakeRoleMappingRuleRoleNullable1784556173999 extends BaseMigration {
	withFKsDisabled = true as const;
}
