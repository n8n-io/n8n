import { StorybookConfig as StorybookConfig$1, CompatibleString } from 'storybook/internal/types';
import { StorybookConfigVite, BuilderOptions } from '@storybook/builder-vite';

type FrameworkName = CompatibleString<'@storybook/vue3-vite'>;
type BuilderName = CompatibleString<'@storybook/builder-vite'>;
/** Available docgen plugins for vue. */
type VueDocgenPlugin = 'vue-docgen-api' | 'vue-component-meta';
type FrameworkOptions = {
    builder?: BuilderOptions;
    /**
     * Plugin to use for generation docs for component props, events, slots and exposes. Since
     * Storybook 8, the official vue plugin "vue-component-meta" (Volar) can be used which supports
     * more complex types, better type docs, support for js(x)/ts(x) components and more.
     *
     * "vue-component-meta" will become the new default in the future and "vue-docgen-api" will be
     * removed.
     *
     * Set to `false` to disable docgen processing entirely for improved build performance.
     *
     * @default 'vue-docgen-api'
     */
    docgen?: boolean | VueDocgenPlugin | {
        plugin: 'vue-component-meta';
        /**
         * Tsconfig filename to use. Should be set if your main `tsconfig.json` includes references
         * to other tsconfig files like `tsconfig.app.json`. Otherwise docgen might not be generated
         * correctly (e.g. import aliases are not resolved).
         *
         * For further information, see our
         * [docs](https://storybook.js.org/docs/get-started/vue3-vite#override-the-default-configuration).
         *
         * @default 'tsconfig.json'
         */
        tsconfig: `tsconfig${string}.json`;
    };
};
type StorybookConfigFramework = {
    framework: FrameworkName | {
        name: FrameworkName;
        options: FrameworkOptions;
    };
    core?: StorybookConfig$1['core'] & {
        builder?: BuilderName | {
            name: BuilderName;
            options: BuilderOptions;
        };
    };
};
/** The interface for Storybook configuration in `main.ts` files. */
type StorybookConfig = Omit<StorybookConfig$1, keyof StorybookConfigVite | keyof StorybookConfigFramework> & StorybookConfigVite & StorybookConfigFramework;

declare function defineMain(config: StorybookConfig): StorybookConfig;

export { defineMain };
