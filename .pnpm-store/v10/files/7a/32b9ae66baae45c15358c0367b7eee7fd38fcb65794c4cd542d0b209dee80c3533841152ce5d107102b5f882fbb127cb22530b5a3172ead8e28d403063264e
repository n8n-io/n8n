import { CommandNameFlags } from "./Command";
declare type AddSet = CommandNameFlags["ENTER_SUBSCRIBER_MODE"][number];
declare type DelSet = CommandNameFlags["EXIT_SUBSCRIBER_MODE"][number];
/**
 * Tiny class to simplify dealing with subscription set
 */
export default class SubscriptionSet {
    private set;
    add(set: AddSet, channel: string): void;
    del(set: DelSet, channel: string): void;
    channels(set: AddSet | DelSet): string[];
    isEmpty(): boolean;
}
export {};
