import { Awaitable } from '@antfu/utils';
import { ExternalPkgName, AutoInstall } from '@iconify/utils/lib/loader/types';
import { CustomIconLoader } from './types.cjs';

declare function FileSystemIconLoader(dir: string, transform?: (svg: string) => Awaitable<string>): CustomIconLoader;
declare function ExternalPackageIconLoader(packageName: ExternalPkgName, autoInstall?: AutoInstall): Record<string, CustomIconLoader>;

export { ExternalPackageIconLoader, FileSystemIconLoader };
