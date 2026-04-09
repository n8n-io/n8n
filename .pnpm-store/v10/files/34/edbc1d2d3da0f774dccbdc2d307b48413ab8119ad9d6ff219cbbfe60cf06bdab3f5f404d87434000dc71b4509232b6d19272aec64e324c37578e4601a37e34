export interface RangeOptions {
    includePrerelease?: boolean | undefined;
    loose?: boolean | undefined;
}
export interface SemverVersionConstraint {
    readonly options?: boolean | RangeOptions;
    readonly range: string;
}
export type AtLeastVersionConstraint = `${number}.${number}.${number}-${string}` | `${number}.${number}.${number}` | `${number}.${number}` | `${number}`;
export type VersionConstraint = AtLeastVersionConstraint | SemverVersionConstraint;
/**
 * Passing a string for the value is shorthand for a '>=' constraint
 */
export type DependencyConstraint = Readonly<Record<string, VersionConstraint>>;
