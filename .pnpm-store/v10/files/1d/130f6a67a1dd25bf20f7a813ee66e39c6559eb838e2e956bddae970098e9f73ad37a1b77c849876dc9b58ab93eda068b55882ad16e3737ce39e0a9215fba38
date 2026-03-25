import { NavigationOptions } from "./NavigationOptions.js";
export interface INavigationClient {
    /**
     * Navigates to other pages within the same web application
     * Return false if this doesn't cause the page to reload i.e. Client-side navigation
     * @param url
     * @param options
     */
    navigateInternal(url: string, options: NavigationOptions): Promise<boolean>;
    /**
     * Navigates to other pages outside the web application i.e. the Identity Provider
     * @param url
     * @param options
     */
    navigateExternal(url: string, options: NavigationOptions): Promise<boolean>;
}
//# sourceMappingURL=INavigationClient.d.ts.map