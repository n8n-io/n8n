declare const ADDON_ID = "storybook/viewport";
declare const PARAM_KEY = "viewport";
declare const PANEL_ID = "storybook/viewport/panel";
declare const TOOL_ID = "storybook/viewport/tool";

interface Viewport {
    name: string;
    styles: ViewportStyles;
    type?: 'desktop' | 'mobile' | 'tablet' | 'other';
}
interface ViewportStyles {
    height: string;
    width: string;
}
type ViewportMap = Record<string, Viewport>;
type GlobalState = {
    /**
     * When set, the viewport is applied and cannot be changed using the toolbar. Must match the key
     * of one of the available viewports.
     */
    value: string | undefined;
    /**
     * When true the viewport applied will be rotated 90°, e.g. it will rotate from portrait to
     * landscape orientation.
     */
    isRotated?: boolean;
};
type GlobalStateUpdate = Partial<GlobalState>;
interface ViewportParameters {
    /**
     * Viewport configuration
     *
     * @see https://storybook.js.org/docs/essentials/viewport#parameters
     */
    viewport?: {
        /**
         * Remove the addon panel and disable the addon's behavior . If you wish to turn off this addon
         * for the entire Storybook, you should do so when registering addon-essentials
         *
         * @see https://storybook.js.org/docs/essentials/index#disabling-addons
         */
        disable?: boolean;
        /**
         * Specify the available viewports. The width and height values must include the unit, e.g.
         * '320px'.
         */
        options: Record<string, Viewport>;
    };
}
interface ViewportGlobals {
    /**
     * Viewport configuration
     *
     * @see https://storybook.js.org/docs/essentials/viewport#globals
     */
    viewport?: GlobalState | GlobalState['value'];
}
interface ViewportTypes {
    parameters: ViewportParameters;
    globals: ViewportGlobals;
}

declare const INITIAL_VIEWPORTS: {
    readonly iphone5: {
        readonly name: "iPhone 5";
        readonly styles: {
            readonly height: "568px";
            readonly width: "320px";
        };
        readonly type: "mobile";
    };
    readonly iphone6: {
        readonly name: "iPhone 6";
        readonly styles: {
            readonly height: "667px";
            readonly width: "375px";
        };
        readonly type: "mobile";
    };
    readonly iphone6p: {
        readonly name: "iPhone 6 Plus";
        readonly styles: {
            readonly height: "736px";
            readonly width: "414px";
        };
        readonly type: "mobile";
    };
    readonly iphone8p: {
        readonly name: "iPhone 8 Plus";
        readonly styles: {
            readonly height: "736px";
            readonly width: "414px";
        };
        readonly type: "mobile";
    };
    readonly iphonex: {
        readonly name: "iPhone X";
        readonly styles: {
            readonly height: "812px";
            readonly width: "375px";
        };
        readonly type: "mobile";
    };
    readonly iphonexr: {
        readonly name: "iPhone XR";
        readonly styles: {
            readonly height: "896px";
            readonly width: "414px";
        };
        readonly type: "mobile";
    };
    readonly iphonexsmax: {
        readonly name: "iPhone XS Max";
        readonly styles: {
            readonly height: "896px";
            readonly width: "414px";
        };
        readonly type: "mobile";
    };
    readonly iphonese2: {
        readonly name: "iPhone SE (2nd generation)";
        readonly styles: {
            readonly height: "667px";
            readonly width: "375px";
        };
        readonly type: "mobile";
    };
    readonly iphone12mini: {
        readonly name: "iPhone 12 mini";
        readonly styles: {
            readonly height: "812px";
            readonly width: "375px";
        };
        readonly type: "mobile";
    };
    readonly iphone12: {
        readonly name: "iPhone 12";
        readonly styles: {
            readonly height: "844px";
            readonly width: "390px";
        };
        readonly type: "mobile";
    };
    readonly iphone12promax: {
        readonly name: "iPhone 12 Pro Max";
        readonly styles: {
            readonly height: "926px";
            readonly width: "428px";
        };
        readonly type: "mobile";
    };
    readonly iphoneSE3: {
        readonly name: "iPhone SE 3rd generation";
        readonly styles: {
            readonly height: "667px";
            readonly width: "375px";
        };
        readonly type: "mobile";
    };
    readonly iphone13: {
        readonly name: "iPhone 13";
        readonly styles: {
            readonly height: "844px";
            readonly width: "390px";
        };
        readonly type: "mobile";
    };
    readonly iphone13pro: {
        readonly name: "iPhone 13 Pro";
        readonly styles: {
            readonly height: "844px";
            readonly width: "390px";
        };
        readonly type: "mobile";
    };
    readonly iphone13promax: {
        readonly name: "iPhone 13 Pro Max";
        readonly styles: {
            readonly height: "926px";
            readonly width: "428px";
        };
        readonly type: "mobile";
    };
    readonly iphone14: {
        readonly name: "iPhone 14";
        readonly styles: {
            readonly height: "844px";
            readonly width: "390px";
        };
        readonly type: "mobile";
    };
    readonly iphone14pro: {
        readonly name: "iPhone 14 Pro";
        readonly styles: {
            readonly height: "852px";
            readonly width: "393px";
        };
        readonly type: "mobile";
    };
    readonly iphone14promax: {
        readonly name: "iPhone 14 Pro Max";
        readonly styles: {
            readonly height: "932px";
            readonly width: "430px";
        };
        readonly type: "mobile";
    };
    readonly ipad: {
        readonly name: "iPad";
        readonly styles: {
            readonly height: "1024px";
            readonly width: "768px";
        };
        readonly type: "tablet";
    };
    readonly ipad10p: {
        readonly name: "iPad Pro 10.5-in";
        readonly styles: {
            readonly height: "1112px";
            readonly width: "834px";
        };
        readonly type: "tablet";
    };
    readonly ipad11p: {
        readonly name: "iPad Pro 11-in";
        readonly styles: {
            readonly height: "1194px";
            readonly width: "834px";
        };
        readonly type: "tablet";
    };
    readonly ipad12p: {
        readonly name: "iPad Pro 12.9-in";
        readonly styles: {
            readonly height: "1366px";
            readonly width: "1024px";
        };
        readonly type: "tablet";
    };
    readonly galaxys5: {
        readonly name: "Galaxy S5";
        readonly styles: {
            readonly height: "640px";
            readonly width: "360px";
        };
        readonly type: "mobile";
    };
    readonly galaxys9: {
        readonly name: "Galaxy S9";
        readonly styles: {
            readonly height: "740px";
            readonly width: "360px";
        };
        readonly type: "mobile";
    };
    readonly nexus5x: {
        readonly name: "Nexus 5X";
        readonly styles: {
            readonly height: "660px";
            readonly width: "412px";
        };
        readonly type: "mobile";
    };
    readonly nexus6p: {
        readonly name: "Nexus 6P";
        readonly styles: {
            readonly height: "732px";
            readonly width: "412px";
        };
        readonly type: "mobile";
    };
    readonly pixel: {
        readonly name: "Pixel";
        readonly styles: {
            readonly height: "960px";
            readonly width: "540px";
        };
        readonly type: "mobile";
    };
    readonly pixelxl: {
        readonly name: "Pixel XL";
        readonly styles: {
            readonly height: "1280px";
            readonly width: "720px";
        };
        readonly type: "mobile";
    };
};
type InitialViewportKeys = keyof typeof INITIAL_VIEWPORTS;
declare const DEFAULT_VIEWPORT = "responsive";
declare const MINIMAL_VIEWPORTS: {
    readonly mobile1: {
        readonly name: "Small mobile";
        readonly styles: {
            readonly height: "568px";
            readonly width: "320px";
        };
        readonly type: "mobile";
    };
    readonly mobile2: {
        readonly name: "Large mobile";
        readonly styles: {
            readonly height: "896px";
            readonly width: "414px";
        };
        readonly type: "mobile";
    };
    readonly tablet: {
        readonly name: "Tablet";
        readonly styles: {
            readonly height: "1112px";
            readonly width: "834px";
        };
        readonly type: "tablet";
    };
    readonly desktop: {
        readonly name: "Desktop";
        readonly styles: {
            readonly height: "1024px";
            readonly width: "1280px";
        };
        readonly type: "desktop";
    };
};

declare const responsiveViewport: Viewport;

export { ADDON_ID, DEFAULT_VIEWPORT, type GlobalState, type GlobalStateUpdate, INITIAL_VIEWPORTS, type InitialViewportKeys, MINIMAL_VIEWPORTS, PANEL_ID, PARAM_KEY, TOOL_ID, type Viewport, type ViewportGlobals, type ViewportMap, type ViewportParameters, type ViewportStyles, type ViewportTypes, responsiveViewport };
