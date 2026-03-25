import type { SimpleGitPlugin, SimpleGitPluginType, SimpleGitPluginTypes } from './simple-git-plugin';
import type { SimpleGitPluginConfig } from '../types';
export declare class PluginStore {
    private plugins;
    private events;
    on<K extends keyof SimpleGitPluginConfig>(type: K, listener: (data: SimpleGitPluginConfig[K]) => void): void;
    reconfigure<K extends keyof SimpleGitPluginConfig>(type: K, data: SimpleGitPluginConfig[K]): void;
    append<T extends SimpleGitPluginType>(type: T, action: SimpleGitPlugin<T>['action']): () => boolean;
    add<T extends SimpleGitPluginType>(plugin: void | SimpleGitPlugin<T> | SimpleGitPlugin<T>[]): () => void;
    exec<T extends SimpleGitPluginType>(type: T, data: SimpleGitPluginTypes[T]['data'], context: SimpleGitPluginTypes[T]['context']): typeof data;
}
