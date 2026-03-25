import { INavigationClient } from "./INavigationClient.js";
import { NavigationOptions } from "./NavigationOptions.js";
export declare class NavigationClient implements INavigationClient {
    /**
     * Navigates to other pages within the same web application
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
    /**
     * Default navigation implementation invoked by the internal and external functions
     * @param url
     * @param options
     */
    private static defaultNavigateWindow;
}
//# sourceMappingURL=NavigationClient.d.ts.map