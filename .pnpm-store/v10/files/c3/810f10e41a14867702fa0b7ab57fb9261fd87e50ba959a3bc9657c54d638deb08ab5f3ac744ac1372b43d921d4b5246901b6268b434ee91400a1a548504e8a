/**
 * Icon name
 */
interface IconifyIconName {
    readonly provider: string;
    readonly prefix: string;
    readonly name: string;
}
/**
 * Icon source: icon object without name
 */
type IconifyIconSource = Omit<IconifyIconName, 'name'>;
/**
 * Expression to test part of icon name.
 *
 * Used when loading icons from Iconify API due to project naming convension.
 * Ignored when using custom icon sets - convension does not apply.
 */
declare const matchIconName: RegExp;
/**
 * Convert string icon name to IconifyIconName object.
 */
declare const stringToIcon: (value: string, validate?: boolean, allowSimpleName?: boolean, provider?: string) => IconifyIconName | null;
/**
 * Check if icon is valid.
 *
 * This function is not part of stringToIcon because validation is not needed for most code.
 */
declare const validateIconName: (icon: IconifyIconName | null, allowSimpleName?: boolean) => boolean;

export { type IconifyIconName, type IconifyIconSource, matchIconName, stringToIcon, validateIconName };
