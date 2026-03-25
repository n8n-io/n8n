/**
 * @public
 */
export type IniSection = Record<string, string | undefined>;
/**
 * @public
 *
 * @deprecated Please use {@link IniSection}
 */
export interface Profile extends IniSection {
}
/**
 * @public
 */
export type ParsedIniData = Record<string, IniSection>;
/**
 * @public
 */
export interface SharedConfigFiles {
    credentialsFile: ParsedIniData;
    configFile: ParsedIniData;
}
