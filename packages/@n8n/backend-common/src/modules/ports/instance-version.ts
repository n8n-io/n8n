/**
 * Port that reports the version of the running n8n instance.
 *
 * The host binds the value at bootstrap, because the host package is the only
 * one that can read its own `package.json`. A module that re-derived the
 * version would risk reporting a different one.
 */
export abstract class InstanceVersion {
	abstract readonly version: string;
}
