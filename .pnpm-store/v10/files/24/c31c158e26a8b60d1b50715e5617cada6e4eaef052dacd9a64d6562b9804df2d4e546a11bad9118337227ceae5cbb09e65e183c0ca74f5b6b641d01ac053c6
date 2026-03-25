import { ModuleBase } from '../../internal/module-base';
declare const commonInterfaceTypes: readonly ["en", "wl", "ww"];
declare const commonInterfaceSchemas: {
    readonly index: "o";
    readonly slot: "s";
    readonly mac: "x";
    readonly pci: "p";
};
/**
 * Generates fake data for many computer systems properties.
 */
export declare class SystemModule extends ModuleBase {
    /**
     * Returns a random file name with extension.
     *
     * @param options An options object.
     * @param options.extensionCount Define how many extensions the file name should have. Defaults to `1`.
     *
     * @example
     * faker.system.fileName() // 'faithfully_calculating.u8mdn'
     * faker.system.fileName({ extensionCount: 2 }) // 'times_after.swf.ntf'
     * faker.system.fileName({ extensionCount: { min: 1, max: 2 } }) // 'jaywalk_like_ill.osfpvg'
     *
     * @since 3.1.0
     */
    fileName(options?: {
        /**
         * Define how many extensions the file name should have.
         *
         * @default 1
         */
        extensionCount?: number | {
            /**
             * Minimum number of extensions.
             */
            min: number;
            /**
             * Maximum number of extensions.
             */
            max: number;
        };
    }): string;
    /**
     * Returns a random file name with a given extension or a commonly used extension.
     *
     * @param ext Extension. Empty string is considered to be not set.
     *
     * @example
     * faker.system.commonFileName() // 'dollar.jpg'
     * faker.system.commonFileName('txt') // 'global_borders_wyoming.txt'
     *
     * @since 3.1.0
     */
    commonFileName(ext?: string): string;
    /**
     * Returns a mime-type.
     *
     * @example
     * faker.system.mimeType() // 'video/vnd.vivo'
     *
     * @since 3.1.0
     */
    mimeType(): string;
    /**
     * Returns a commonly used file type.
     *
     * @example
     * faker.system.commonFileType() // 'audio'
     *
     * @since 3.1.0
     */
    commonFileType(): string;
    /**
     * Returns a commonly used file extension.
     *
     * @example
     * faker.system.commonFileExt() // 'gif'
     *
     * @since 3.1.0
     */
    commonFileExt(): string;
    /**
     * Returns a file type.
     *
     * @example
     * faker.system.fileType() // 'message'
     *
     * @since 3.1.0
     */
    fileType(): string;
    /**
     * Returns a file extension.
     *
     * @param mimeType Valid [mime-type](https://github.com/jshttp/mime-db/blob/master/db.json)
     *
     * @example
     * faker.system.fileExt() // 'emf'
     * faker.system.fileExt('application/json') // 'json'
     *
     * @since 3.1.0
     */
    fileExt(mimeType?: string): string;
    /**
     * Returns a directory path.
     *
     * @example
     * faker.system.directoryPath() // '/etc/mail'
     *
     * @since 3.1.0
     */
    directoryPath(): string;
    /**
     * Returns a file path.
     *
     * @example
     * faker.system.filePath() // '/usr/local/src/money.dotx'
     *
     * @since 3.1.0
     */
    filePath(): string;
    /**
     * Returns a [semantic version](https://semver.org).
     *
     * @example
     * faker.system.semver() // '1.1.2'
     *
     * @since 3.1.0
     */
    semver(): string;
    /**
     * Returns a random [network interface](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/networking_guide/sec-understanding_the_predictable_network_interface_device_names).
     *
     * @param options The options to use.
     * @param options.interfaceType The interface type. Can be one of `en`, `wl`, `ww`.
     * @param options.interfaceSchema The interface schema. Can be one of `index`, `slot`, `mac`, `pci`.
     *
     * @example
     * faker.system.networkInterface() // 'enp0s3'
     * faker.system.networkInterface({ interfaceType: 'wl' }) // 'wlo1'
     * faker.system.networkInterface({ interfaceSchema: 'mac' }) // 'enx000c29c00000'
     * faker.system.networkInterface({ interfaceType: 'en', interfaceSchema: 'pci' }) // 'enp5s0f1d0'
     *
     * @since 7.4.0
     */
    networkInterface(options?: {
        /**
         * The interface type. Can be one of `en`, `wl`, `ww`.
         *
         * @default faker.helpers.arrayElement(['en', 'wl', 'ww'])
         */
        interfaceType?: (typeof commonInterfaceTypes)[number];
        /**
         * The interface schema. Can be one of `index`, `slot`, `mac`, `pci`.
         *
         * @default faker.helpers.objectKey(['index' | 'slot' | 'mac' | 'pci'])
         */
        interfaceSchema?: keyof typeof commonInterfaceSchemas;
    }): string;
    /**
     * Returns a random cron expression.
     *
     * @param options The optional options to use.
     * @param options.includeYear Whether to include a year in the generated expression. Defaults to `false`.
     * @param options.includeNonStandard Whether to include a @yearly, @monthly, @daily, etc text labels in the generated expression. Defaults to `false`.
     *
     * @example
     * faker.system.cron() // '45 23 * * 6'
     * faker.system.cron({ includeYear: true }) // '45 23 * * 6 2067'
     * faker.system.cron({ includeYear: false }) // '45 23 * * 6'
     * faker.system.cron({ includeNonStandard: false }) // '45 23 * * 6'
     * faker.system.cron({ includeNonStandard: true }) // '@yearly'
     *
     * @since 7.5.0
     */
    cron(options?: {
        /**
         * Whether to include a year in the generated expression.
         *
         * @default false
         */
        includeYear?: boolean;
        /**
         * Whether to include a @yearly, @monthly, @daily, etc text labels in the generated expression.
         *
         * @default false
         */
        includeNonStandard?: boolean;
    }): string;
}
export {};
