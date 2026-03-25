import { Reporter, FullConfig, Suite } from '@playwright/test/reporter';

declare class DiscoveryReporter implements Reporter {
    onBegin(config: FullConfig<{}, {}>, suite: Suite): void;
    private getFullTestSuite;
    printsToStdio(): boolean;
}

export { DiscoveryReporter, DiscoveryReporter as default };
