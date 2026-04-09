import { Awaitable } from '@antfu/utils';
import { IconifyLoaderOptions } from './types.mjs';
import '../customisations/defaults.mjs';
import '@iconify/types';

declare function mergeIconProps(svg: string, collection: string, icon: string, options?: IconifyLoaderOptions, propsProvider?: () => Awaitable<Record<string, string>>, afterCustomizations?: (props: Record<string, string>) => void): Promise<string>;
declare function getPossibleIconNames(icon: string): string[];

export { getPossibleIconNames, mergeIconProps };
