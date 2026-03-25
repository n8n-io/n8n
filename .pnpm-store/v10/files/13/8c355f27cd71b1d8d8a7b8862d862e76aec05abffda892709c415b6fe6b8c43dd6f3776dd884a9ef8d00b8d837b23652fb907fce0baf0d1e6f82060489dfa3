import { ChannelOptions } from './channel-options';
import { Subchannel } from './subchannel';
import { SubchannelAddress } from './subchannel-address';
import { ChannelCredentials } from './channel-credentials';
import { GrpcUri } from './uri-parser';
export declare class SubchannelPool {
    private pool;
    /**
     * A timer of a task performing a periodic subchannel cleanup.
     */
    private cleanupTimer;
    /**
     * A pool of subchannels use for making connections. Subchannels with the
     * exact same parameters will be reused.
     */
    constructor();
    /**
     * Unrefs all unused subchannels and cancels the cleanup task if all
     * subchannels have been unrefed.
     */
    unrefUnusedSubchannels(): void;
    /**
     * Ensures that the cleanup task is spawned.
     */
    ensureCleanupTask(): void;
    /**
     * Get a subchannel if one already exists with exactly matching parameters.
     * Otherwise, create and save a subchannel with those parameters.
     * @param channelTarget
     * @param subchannelTarget
     * @param channelArguments
     * @param channelCredentials
     */
    getOrCreateSubchannel(channelTargetUri: GrpcUri, subchannelTarget: SubchannelAddress, channelArguments: ChannelOptions, channelCredentials: ChannelCredentials): Subchannel;
}
/**
 * Get either the global subchannel pool, or a new subchannel pool.
 * @param global
 */
export declare function getSubchannelPool(global: boolean): SubchannelPool;
