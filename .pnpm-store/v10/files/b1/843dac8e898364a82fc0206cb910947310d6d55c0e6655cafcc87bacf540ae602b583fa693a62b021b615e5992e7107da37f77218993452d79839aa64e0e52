import { IconifyJSON } from '@iconify/types';

/**
 * Minify icon set
 *
 * Function finds common values for few numeric properties, such as 'width' and 'height' (see defaultIconDimensions keys for list of properties),
 * removes entries from icons and sets default entry in root of icon set object.
 *
 * For example, this:
 * {
 *  icons: {
 *      foo: {
 *          body: '<g />',
 *          width: 24
 *      },
 *      bar: {
 *          body: '<g />',
 *          width: 24
 *      },
 *      baz: {
 *          body: '<g />',
 *          width: 16
 *      }
 *  }
 * }
 * is changed to this:
 * {
 *  icons: {
 *      foo: {
 *          body: '<g />'
 *      },
 *      bar: {
 *          body: '<g />'
 *      },
 *      baz: {
 *          body: '<g />',
 *          width: 16
 *      }
 *  },
 *  width: 24
 * }
 */
declare function minifyIconSet(data: IconifyJSON): void;

export { minifyIconSet };
