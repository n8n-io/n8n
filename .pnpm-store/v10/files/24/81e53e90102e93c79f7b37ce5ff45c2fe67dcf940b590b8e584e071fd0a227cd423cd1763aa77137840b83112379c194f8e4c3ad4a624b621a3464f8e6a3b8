import type { App } from './api/index.js';
export interface PluginDescriptor {
    id: string;
    label: string;
    app: App;
    packageName?: string;
    homepage?: string;
    componentStateTypes?: string[];
    logo?: string;
    disableAppScope?: boolean;
    disablePluginScope?: boolean;
    /**
     * Run the plugin setup and expose the api even if the devtools is not opened yet.
     * Useful to record timeline events early.
     */
    enableEarlyProxy?: boolean;
    settings?: Record<string, PluginSettingsItem>;
}
export type PluginSettingsItem = {
    label: string;
    description?: string;
} & ({
    type: 'boolean';
    defaultValue: boolean;
} | {
    type: 'choice';
    defaultValue: string | number;
    options: {
        value: string | number;
        label: string;
    }[];
    component?: 'select' | 'button-group';
} | {
    type: 'text';
    defaultValue: string;
});
type InferSettingsType<T extends PluginSettingsItem> = [T] extends [{
    type: 'boolean';
}] ? boolean : [T] extends [{
    type: 'choice';
}] ? T['options'][number]['value'] : [T] extends [{
    type: 'text';
}] ? string : unknown;
export type ExtractSettingsTypes<O extends Record<string, PluginSettingsItem>> = {
    [K in keyof O]: InferSettingsType<O[K]>;
};
export {};
