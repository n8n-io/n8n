import type { ReplayIntegrationPrivacyOptions } from '../types';
type GetPrivacyOptions = Required<Omit<ReplayIntegrationPrivacyOptions, 'maskFn'>>;
interface GetPrivacyReturn {
    maskTextSelector: string;
    unmaskTextSelector: string;
    blockSelector: string;
    unblockSelector: string;
    ignoreSelector: string;
    blockClass?: RegExp;
    maskTextClass?: RegExp;
}
/**
 * Returns privacy related configuration for use in rrweb
 */
export declare function getPrivacyOptions({ mask, unmask, block, unblock, ignore }: GetPrivacyOptions): GetPrivacyReturn;
export {};
//# sourceMappingURL=getPrivacyOptions.d.ts.map