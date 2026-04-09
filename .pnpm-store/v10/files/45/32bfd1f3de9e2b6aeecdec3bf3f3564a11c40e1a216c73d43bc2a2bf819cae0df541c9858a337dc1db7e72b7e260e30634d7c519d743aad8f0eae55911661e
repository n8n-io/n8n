import { IconifyTransformations } from '@iconify/types';

/**
 * Icon size
 */
type IconifyIconSize = null | string | number;
/**
 * Dimensions
 */
interface IconifyIconSizeCustomisations {
    width?: IconifyIconSize;
    height?: IconifyIconSize;
}
/**
 * Icon customisations
 */
interface IconifyIconCustomisations extends IconifyTransformations, IconifyIconSizeCustomisations {
}
type FullIconCustomisations = Required<IconifyIconCustomisations>;
/**
 * Default icon customisations values
 */
declare const defaultIconSizeCustomisations: Required<IconifyIconSizeCustomisations>;
declare const defaultIconCustomisations: FullIconCustomisations;

export { type FullIconCustomisations, type IconifyIconCustomisations, type IconifyIconSize, type IconifyIconSizeCustomisations, defaultIconCustomisations, defaultIconSizeCustomisations };
