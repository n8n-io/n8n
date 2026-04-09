import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
export declare class AriaAnnouncementService extends BeanStub implements NamedBean {
    beanName: "ariaAnnounce";
    private descriptionContainer;
    private readonly pendingAnnouncements;
    private lastAnnouncement;
    constructor();
    postConstruct(): void;
    /**
     * @param key used for debouncing calls
     */
    announceValue(value: string, key: string): void;
    private updateAnnouncement;
    private handleAnnouncementUpdate;
    destroy(): void;
}
