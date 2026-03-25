/// <reference types="node" />

import DockerModem = require("docker-modem");
import events = require("events");
import { ConnectConfig } from "ssh2";
import stream = require("stream");

declare namespace Dockerode {
    class Container {
        constructor(modem: any, id: string);

        modem: any;
        id: string;

        inspect(options: ContainerInspectOptions, callback: Callback<ContainerInspectInfo>): void;
        inspect(callback: Callback<ContainerInspectInfo>): void;
        inspect(options?: ContainerInspectOptions): Promise<ContainerInspectInfo>;

        rename(options: {}, callback: Callback<any>): void;
        rename(options: {}): Promise<any>;

        update(options: {}, callback: Callback<any>): void;
        update(options: {}): Promise<any>;

        top(options: {}, callback: Callback<any>): void;
        top(callback: Callback<any>): void;
        top(options?: {}): Promise<any>;

        changes(options: {}, callback: Callback<any>): void;
        changes(callback: Callback<any>): void;
        changes(options?: {}): Promise<any>;

        export(options: {}, callback: Callback<NodeJS.ReadableStream>): void;
        export(callback: Callback<NodeJS.ReadableStream>): void;
        export(options?: {}): Promise<NodeJS.ReadableStream>;

        start(options: ContainerStartOptions, callback: Callback<any>): void;
        start(callback: Callback<any>): void;
        start(options?: ContainerStartOptions): Promise<any>;

        pause(options: {}, callback: Callback<any>): void;
        pause(callback: Callback<any>): void;
        pause(options?: {}): Promise<any>;

        unpause(options: {}, callback: Callback<any>): void;
        unpause(callback: Callback<any>): void;
        unpause(options?: {}): Promise<any>;

        exec(options: ExecCreateOptions, callback: Callback<Exec>): void;
        exec(options: ExecCreateOptions): Promise<Exec>;

        commit(options: {}, callback: Callback<any>): void;
        commit(callback: Callback<any>): void;
        commit(options?: {}): Promise<any>;

        stop(options: ContainerStopOptions, callback: Callback<any>): void;
        stop(callback: Callback<any>): void;
        stop(options?: ContainerStopOptions): Promise<any>;

        restart(options: {}, callback: Callback<any>): void;
        restart(callback: Callback<any>): void;
        restart(options?: {}): Promise<any>;

        kill(options: {}, callback: Callback<any>): void;
        kill(callback: Callback<any>): void;
        kill(options?: {}): Promise<any>;

        resize(options: {}, callback: Callback<any>): void;
        resize(callback: Callback<any>): void;
        resize(options?: {}): Promise<any>;

        wait(options: ContainerWaitOptions, callback: Callback<any>): void;
        wait(callback: Callback<any>): void;
        wait(options?: ContainerWaitOptions): Promise<any>;

        remove(options: ContainerRemoveOptions, callback: Callback<any>): void;
        remove(callback: Callback<any>): void;
        remove(options?: {}): Promise<any>;

        /** Deprecated since RAPI v1.20 */
        copy(options: {}, callback: Callback<any>): void;
        /** Deprecated since RAPI v1.20 */
        copy(callback: Callback<any>): void;
        /** Deprecated since RAPI v1.20 */
        copy(options?: {}): Promise<any>;

        getArchive(options: {}, callback: Callback<NodeJS.ReadableStream>): void;
        getArchive(options: {}): Promise<NodeJS.ReadableStream>;

        infoArchive(options: {}, callback: Callback<any>): void;
        infoArchive(options: {}): Promise<any>;

        /** @param file Filename (will read synchronously), Buffer or stream */
        putArchive(
            file: string | Buffer | NodeJS.ReadableStream,
            options: {},
            callback: Callback<NodeJS.WritableStream>,
        ): void;
        putArchive(file: string | Buffer | NodeJS.ReadableStream, options: {}): Promise<NodeJS.ReadWriteStream>;

        logs(options: ContainerLogsOptions & { follow?: false }, callback: Callback<Buffer>): void;
        logs(options: ContainerLogsOptions & { follow: true }, callback: Callback<NodeJS.ReadableStream>): void;
        logs(callback: Callback<Buffer>): void;
        logs(options?: ContainerLogsOptions & { follow?: false }): Promise<Buffer>;
        logs(options?: ContainerLogsOptions & { follow: true }): Promise<NodeJS.ReadableStream>;

        stats(options: { stream?: false; "one-shot"?: boolean }, callback: Callback<ContainerStats>): void;
        stats(options: { stream: true }, callback: Callback<NodeJS.ReadableStream>): void;
        stats(callback: Callback<ContainerStats>): void;
        stats(options?: { stream?: false; "one-shot"?: boolean }): Promise<ContainerStats>;
        stats(options?: { stream: true }): Promise<NodeJS.ReadableStream>;

        attach(options: ContainerAttachOptions, callback: Callback<NodeJS.ReadWriteStream>): void;
        attach(options: ContainerAttachOptions): Promise<NodeJS.ReadWriteStream>;
    }

    class Image {
        constructor(modem: any, name: string);

        modem: any;
        id: string;

        inspect(options: ImageInspectOptions, callback: Callback<ImageInspectInfo>): void;
        inspect(callback: Callback<ImageInspectInfo>): void;
        inspect(options?: ImageInspectOptions): Promise<ImageInspectInfo>;

        history(callback: Callback<any>): void;
        history(): Promise<any>;

        get(callback: Callback<NodeJS.ReadableStream>): void;
        get(): Promise<NodeJS.ReadableStream>;

        push(options: ImagePushOptions, callback: Callback<NodeJS.ReadableStream>, auth?: AuthConfig): void;
        push(callback: Callback<NodeJS.ReadableStream>, auth?: AuthConfig): void;
        push(options?: ImagePushOptions): Promise<NodeJS.ReadableStream>;
        push(options?: ImagePushOptions, callback?: undefined, auth?: AuthConfig): Promise<NodeJS.ReadableStream>;

        tag(options: ImageTagOptions, callback: Callback<any>): void;
        tag(callback: Callback<any>): void;
        tag(options?: ImageTagOptions): Promise<any>;

        remove(options: ImageRemoveOptions, callback: Callback<ImageRemoveInfo>): void;
        remove(callback: Callback<ImageRemoveInfo>): void;
        remove(options?: {}): Promise<any>;

        distribution(options: ImageDistributionOptions, callback: Callback<ImageDistributionInfo>): void;
        distribution(callback: Callback<ImageDistributionInfo>): void;
        distribution(options?: ImageDistributionOptions): Promise<ImageDistributionInfo>;
    }

    class Volume {
        constructor(modem: any, name: string);

        modem: any;
        name: string;

        inspect(options: {}, callback: Callback<VolumeInspectInfo>): void;
        inspect(callback: Callback<VolumeInspectInfo>): void;
        inspect(options?: {}): Promise<VolumeInspectInfo>;

        remove(options: VolumeRemoveOptions, callback: Callback<any>): void;
        remove(callback: Callback<any>): void;
        remove(options?: VolumeRemoveOptions): Promise<any>;
    }

    class Service {
        constructor(modem: any, id: string);

        modem: any;
        id: string;

        inspect(options: {}, callback: Callback<any>): void;
        inspect(callback: Callback<any>): void;
        inspect(options?: {}): Promise<any>;

        remove(options: {}, callback: Callback<any>): void;
        remove(callback: Callback<any>): void;
        remove(options?: {}): Promise<any>;

        update(options: {}, callback: Callback<any>): void;
        update(options: {}): Promise<any>;

        logs(options: ContainerLogsOptions, callback: Callback<NodeJS.ReadableStream>): void;
        logs(callback: Callback<NodeJS.ReadableStream>): void;
        logs(options?: ContainerLogsOptions): Promise<NodeJS.ReadableStream>;
    }

    class Task {
        constructor(modem: any, id: string);

        modem: any;
        id: string;

        inspect(options: {}, callback: Callback<any>): void;
        inspect(callback: Callback<any>): void;
        inspect(options?: {}): Promise<any>;
    }

    class Node {
        constructor(modem: any, id: string);

        modem: any;
        id: string;

        inspect(options: {}, callback: Callback<any>): void;
        inspect(callback: Callback<any>): void;
        inspect(options?: {}): Promise<any>;

        update(options: {}, callback: Callback<any>): void;
        update(callback: Callback<any>): void;
        update(options?: {}): Promise<any>;

        remove(options: {}, callback: Callback<any>): void;
        remove(callback: Callback<any>): void;
        remove(options?: {}): Promise<any>;
    }

    class Plugin {
        constructor(modem: any, name: string, remote?: any);

        modem: any;
        name: string;
        remote: any;

        inspect(options: {}, callback: Callback<PluginInspectInfo>): void;
        inspect(callback: Callback<PluginInspectInfo>): void;
        inspect(options?: {}): Promise<PluginInspectInfo>;

        remove(options: {}, callback: Callback<any>): void;
        remove(callback: Callback<any>): void;
        remove(options?: {}): Promise<any>;

        privileges(options: {}, callback: Callback<any>): void;
        privileges(callback: Callback<any>): void;
        privileges(options?: {}): Promise<any>;

        pull(options: {}, callback: Callback<any>): void;
        pull(options: {}): Promise<any>;

        enable(options: {}, callback: Callback<any>): void;
        enable(callback: Callback<any>): void;
        enable(options?: {}): Promise<any>;

        disable(options: {}, callback: Callback<any>): void;
        disable(callback: Callback<any>): void;
        disable(options?: {}): Promise<any>;

        push(options: {}, callback: Callback<any>): void;
        push(callback: Callback<any>): void;
        push(options?: {}): Promise<any>;

        configure(options: {}, callback: Callback<any>): void;
        configure(callback: Callback<any>): void;
        configure(options?: {}): Promise<any>;

        upgrade(auth: any, options: {}, callback: Callback<any>): void;
        upgrade(auth: any, callback: Callback<any>): void;
        upgrade(auth: any, options?: {}): Promise<any>;
    }

    class Secret {
        constructor(modem: any, id: string);

        modem: any;
        id: string;

        inspect(options: {}, callback: Callback<Secret>): void;
        inspect(callback: Callback<Secret>): void;
        inspect(options?: {}): Promise<Secret>;

        update(options: {}, callback: Callback<any>): void;
        update(callback: Callback<any>): void;
        update(options?: {}): Promise<any>;

        remove(options: {}, callback: Callback<any>): void;
        remove(callback: Callback<any>): void;
        remove(options?: {}): Promise<any>;
    }

    class Network {
        constructor(modem: any, id: string);

        modem: any;
        id: string;

        inspect(callback: Callback<NetworkInspectInfo>): void;
        inspect(): Promise<NetworkInspectInfo>;

        remove(options: {}, callback: Callback<any>): void;
        remove(callback: Callback<any>): void;
        remove(options?: {}): Promise<any>;

        connect(options: NetworkConnectOptions, callback: Callback<any>): void;
        connect(callback: Callback<any>): void;
        connect(options?: NetworkConnectOptions): Promise<any>;

        disconnect(options: {}, callback: Callback<any>): void;
        disconnect(callback: Callback<any>): void;
        disconnect(options?: {}): Promise<any>;
    }

    class Exec {
        constructor(modem: any, id: string);

        modem: any;
        id: string;

        inspect(options: ExecInspectOptions, callback: Callback<ExecInspectInfo>): void;
        inspect(callback: Callback<ExecInspectInfo>): void;
        inspect(options?: ExecInspectOptions): Promise<ExecInspectInfo>;

        start(options: ExecStartOptions, callback: Callback<stream.Duplex>): void;
        start(options: ExecStartOptions): Promise<stream.Duplex>;

        resize(options: {}, callback: Callback<any>): void;
        resize(options: {}): Promise<any>;
    }

    class Config {
        constructor(modem: any, id: string);

        modem: any;
        id: string;

        inspect(options: {}, callback: Callback<ConfigInfo>): void;
        inspect(callback: Callback<ConfigInfo>): void;
        inspect(options?: {}): Promise<ConfigInfo>;

        update(options: {}, callback: Callback<any>): void;
        update(callback: Callback<any>): void;
        update(options?: {}): Promise<any>;

        remove(options: {}, callback: Callback<any>): void;
        remove(callback: Callback<any>): void;
        remove(options?: {}): Promise<any>;
    }

    type Duration = number;

    interface ImageDescriptor {
        mediaType: string;
        digest: string;
        size: number;
        urls?: string[] | undefined;
        annotations?: { [key: string]: string } | undefined;
        data?: string | undefined;
        platform?:
            | {
                architecture: string;
                os: string;
                "os.version"?: string | undefined;
                "os.features"?: string[] | undefined;
                variant?: string | undefined;
            }
            | undefined;
        artifactType?: string | undefined;
    }

    interface ImageInfo {
        Id: string;
        ParentId: string;
        RepoTags: string[] | undefined;
        RepoDigests?: string[] | undefined;
        Created: number;
        Size: number;
        VirtualSize: number;
        SharedSize: number;
        Labels: { [label: string]: string };
        Containers: number;
        Descriptor?: ImageDescriptor | undefined;
        Manifests?:
            | {
                ID: string;
                Descriptor: ImageDescriptor;
                Available: boolean;
                Size: {
                    Total: number;
                    Content: number;
                };
                Kind: "image" | "attestation" | "unknown";
                ImageData?:
                    | {
                        Platform: {
                            architecture: string;
                            os: string;
                            "os.version"?: string | undefined;
                            "os.features"?: string[] | undefined;
                            variant?: string | undefined;
                        };
                        Containers: string[];
                        Size: {
                            Unpacked: number;
                        };
                    }
                    | undefined;
                AttestationData?:
                    | {
                        For: string;
                    }
                    | undefined;
            }[]
            | undefined;
    }

    interface ContainerInfo {
        Id: string;
        Names: string[];
        Image: string;
        ImageID: string;
        Command: string;
        Created: number;
        Ports: Port[];
        Labels: { [label: string]: string };
        State: string;
        Status: string;
        HostConfig: {
            NetworkMode: string;
        };
        NetworkSettings: {
            Networks: { [networkType: string]: NetworkInfo };
        };
        Mounts: Array<{
            Name?: string | undefined;
            Type: string;
            Source: string;
            Destination: string;
            Driver?: string | undefined;
            Mode: string;
            RW: boolean;
            Propagation: string;
        }>;
    }

    interface Port {
        IP: string;
        PrivatePort: number;
        PublicPort: number;
        Type: string;
    }

    interface NetworkInfo {
        IPAMConfig?: any;
        Links?: any;
        Aliases?: any;
        NetworkID: string;
        EndpointID: string;
        Gateway: string;
        IPAddress: string;
        IPPrefixLen: number;
        IPv6Gateway: string;
        GlobalIPv6Address: string;
        GlobalIPv6PrefixLen: number;
        MacAddress: string;
    }

    // Information returned from inspecting a network
    interface NetworkInspectInfo {
        Name: string;
        Id: string;
        Created: string;
        Scope: string;
        Driver: string;
        EnableIPv6: boolean;
        IPAM?: IPAM | undefined;
        Internal: boolean;
        Attachable: boolean;
        Ingress: boolean;
        ConfigFrom?: { Network: string } | undefined;
        ConfigOnly: boolean;
        Containers?: { [id: string]: NetworkContainer } | undefined;
        Options?: { [key: string]: string } | undefined;
        Labels?: { [key: string]: string } | undefined;
    }

    interface NetworkCreateOptions {
        Name: string;
        CheckDuplicate?: boolean | undefined;
        Driver?: string | undefined;
        Scope?: string | undefined;
        EnableIPv4?: boolean | undefined;
        EnableIPv6?: boolean | undefined;
        IPAM?: IPAM | undefined;
        Internal?: boolean | undefined;
        Attachable?: boolean | undefined;
        Ingress?: boolean | undefined;
        ConfigOnly?: boolean | undefined;
        ConfigFrom?: { Network: string } | undefined;
        Options?: { [option: string]: string } | undefined;
        Labels?: { [label: string]: string } | undefined;

        abortSignal?: AbortSignal;
    }

    interface NetworkConnectOptions {
        Container?: string;
        EndpointConfig?: EndpointSettings | undefined;
    }

    interface NetworkContainer {
        Name: string;
        EndpointID: string;
        MacAddress: string;
        IPv4Address: string;
        IPv6Address: string;
    }

    interface IPAM {
        Driver?: string;
        Options?: { [key: string]: string } | undefined;
        Config?:
            | Array<{
                Subnet?: string | undefined;
                IPRange?: string | undefined;
                Gateway?: string | undefined;
                AuxiliaryAddresses?: Partial<{ [host: string]: string }> | undefined;
            }>
            | undefined;
    }

    interface VolumeCreateOptions {
        Name?: string | undefined;
        Driver?: string | undefined;
        DriverOpts?: { [key: string]: string } | undefined;
        Labels?: { [label: string]: string } | undefined;
        abortSignal?: AbortSignal;
    }

    interface VolumePruneOptions {
        abortSignal?: AbortSignal;
        /**
         * Filters to process on the prune list, encoded as JSON (a `map[string][]string`).
         * A dictionary of key/value list is also accepted.
         */
        filters?: string | { [key: string]: string[] };
    }

    interface VolumeRemoveOptions {
        abortSignal?: AbortSignal;
        force?: boolean | undefined;
    }

    interface VolumeCreateResponse {
        Name: string;
        Driver: string;
        Mountpoint: string;
        CreatedAt?: string | undefined;
        Status?: { [key: string]: string } | undefined;
        Labels: { [label: string]: string };
        Scope: string;
        Options: { [key: string]: string };
        // Field is sometimes present, and sometimes null
        UsageData?:
            | {
                Size: number;
                RefCount: number;
            }
            | null
            | undefined;
    }

    interface VolumeInspectInfo {
        Name: string;
        Driver: string;
        Mountpoint: string;
        Status?: { [key: string]: string } | undefined;
        Labels: { [key: string]: string };
        Scope: "local" | "global";
        // Field is always present, but sometimes is null
        Options: { [key: string]: string } | null;
        // Field is sometimes present, and sometimes null
        UsageData?:
            | {
                Size: number;
                RefCount: number;
            }
            | null
            | undefined;
    }

    interface ContainerInspectInfo {
        Id: string;
        Created: string;
        Path: string;
        Args: string[];
        State: {
            Status: string;
            Running: boolean;
            Paused: boolean;
            Restarting: boolean;
            OOMKilled: boolean;
            Dead: boolean;
            Pid: number;
            ExitCode: number;
            Error: string;
            StartedAt: string;
            FinishedAt: string;
            Health?:
                | {
                    Status: string;
                    FailingStreak: number;
                    Log: Array<{
                        Start: string;
                        End: string;
                        ExitCode: number;
                        Output: string;
                    }>;
                }
                | undefined;
        };
        Image: string;
        ResolvConfPath: string;
        HostnamePath: string;
        HostsPath: string;
        LogPath: string;
        Name: string;
        RestartCount: number;
        Driver: string;
        Platform: string;
        MountLabel: string;
        ProcessLabel: string;
        AppArmorProfile: string;
        ExecIDs?: string[] | undefined;
        HostConfig: HostConfig;
        GraphDriver: {
            Name: string;
            Data: {
                DeviceId: string;
                DeviceName: string;
                DeviceSize: string;
            };
        };
        Mounts: Array<{
            Type: "bind" | "volume" | "image" | "tmpfs" | "npipe" | "cluster";
            Name?: string | undefined;
            Source: string;
            Destination: string;
            Driver?: string | undefined;
            Mode: string;
            RW: boolean;
            Propagation: string;
        }>;
        Config: {
            Hostname: string;
            Domainname: string;
            User: string;
            AttachStdin: boolean;
            AttachStdout: boolean;
            AttachStderr: boolean;
            ExposedPorts: { [portAndProtocol: string]: {} };
            Tty: boolean;
            OpenStdin: boolean;
            StdinOnce: boolean;
            Env: string[];
            Cmd: string[];
            Image: string;
            Volumes: { [volume: string]: {} };
            WorkingDir: string;
            Entrypoint?: string | string[] | undefined;
            OnBuild?: any;
            Labels: { [label: string]: string };
            Healthcheck?: HealthConfig | undefined;
        };
        NetworkSettings: {
            Bridge: string;
            SandboxID: string;
            HairpinMode: boolean;
            LinkLocalIPv6Address: string;
            LinkLocalIPv6PrefixLen: number;
            Ports: {
                [portAndProtocol: string]: Array<{
                    HostIp: string;
                    HostPort: string;
                }>;
            };
            SandboxKey: string;
            SecondaryIPAddresses?: any;
            SecondaryIPv6Addresses?: any;
            EndpointID: string;
            Gateway: string;
            GlobalIPv6Address: string;
            GlobalIPv6PrefixLen: number;
            IPAddress: string;
            IPPrefixLen: number;
            IPv6Gateway: string;
            MacAddress: string;
            Networks: {
                [type: string]: {
                    IPAMConfig?: any;
                    Links?: any;
                    Aliases?: any;
                    NetworkID: string;
                    EndpointID: string;
                    Gateway: string;
                    IPAddress: string;
                    IPPrefixLen: number;
                    IPv6Gateway: string;
                    GlobalIPv6Address: string;
                    GlobalIPv6PrefixLen: number;
                    MacAddress: string;
                };
            };
            Node?:
                | {
                    ID: string;
                    IP: string;
                    Addr: string;
                    Name: string;
                    Cpus: number;
                    Memory: number;
                    Labels: any;
                }
                | undefined;
        };
    }

    interface NetworkListOptions {
        /**
         * JSON encoded value of the filters (a `map[string][]string`) to process on the networks list.
         * A dictionary of key/value list is also accepted.
         */
        filters?: string | { [key: string]: string[] };
        abortSignal?: AbortSignal;
    }

    interface NetworkStats {
        [name: string]: {
            rx_bytes: number;
            rx_dropped: number;
            rx_errors: number;
            rx_packets: number;
            tx_bytes: number;
            tx_dropped: number;
            tx_errors: number;
            tx_packets: number;
            endpoint_id?: string; // not used on linux
            instance_id?: string; // not used on linux
        };
    }

    interface VolumeListOptions {
        abortSignal?: AbortSignal;
        /**
         * A JSON encoded value of the filters (a map[string][]string) to process on the volume list.
         */
        filters?: string | { [key: string]: string[] };
        /**
         * Show digest information as a RepoDigests field on each image.
         * @default false
         */
        digests?: boolean;
    }

    interface NodeListOptions {
        abortSignal?: AbortSignal;
        /**
         * Filters to process on the nodes list, encoded as JSON (a `map[string][]string`).
         */
        filters?: string;
    }

    interface CPUUsage {
        percpu_usage: number[];
        usage_in_usermode: number;
        total_usage: number;
        usage_in_kernelmode: number;
    }

    interface ThrottlingData {
        periods: number;
        throttled_periods: number;
        throttled_time: number;
    }

    interface CPUStats {
        cpu_usage: CPUUsage;
        system_cpu_usage: number;
        online_cpus: number;
        throttling_data: ThrottlingData;
    }

    interface MemoryStats {
        // Linux Memory Stats
        stats: {
            total_pgmajfault: number;
            cache: number;
            mapped_file: number;
            total_inactive_file: number;
            pgpgout: number;
            rss: number;
            total_mapped_file: number;
            writeback: number;
            unevictable: number;
            pgpgin: number;
            total_unevictable: number;
            pgmajfault: number;
            total_rss: number;
            total_rss_huge: number;
            total_writeback: number;
            total_inactive_anon: number;
            rss_huge: number;
            hierarchical_memory_limit: number;
            total_pgfault: number;
            total_active_file: number;
            active_anon: number;
            total_active_anon: number;
            total_pgpgout: number;
            total_cache: number;
            inactive_anon: number;
            active_file: number;
            pgfault: number;
            inactive_file: number;
            total_pgpgin: number;
        };
        max_usage: number;
        usage: number;
        failcnt: number;
        limit: number;

        // Windows Memory Stats
        commitbytes?: number;
        commitpeakbytes?: number;
        privateworkingset?: number;
    }

    interface BlkioStatEntry {
        major: number;
        minor: number;
        op: string;
        value: number;
    }

    interface BlkioStats {
        io_service_bytes_recursive: BlkioStatEntry[];
        io_serviced_recursive: BlkioStatEntry[];
        io_queue_recursive: BlkioStatEntry[];
        io_service_time_recursive: BlkioStatEntry[];
        io_wait_time_recursive: BlkioStatEntry[];
        io_merged_recursive: BlkioStatEntry[];
        io_time_recursive: BlkioStatEntry[];
        sectors_recursive: BlkioStatEntry[];
    }

    interface StorageStats {
        read_count_normalized?: number;
        read_size_bytes?: number;
        write_count_normalized?: number;
        write_size_bytes?: number;
    }

    interface PidsStats {
        current?: number;
        limit?: number;
    }

    interface ContainerStats {
        read: string;
        preread: string;
        pids_stats?: PidsStats;
        blkio_stats?: BlkioStats;
        num_procs: number;
        storage_stats?: StorageStats;
        networks: NetworkStats;
        memory_stats: MemoryStats;
        cpu_stats: CPUStats;
        precpu_stats: CPUStats;
    }

    interface HostConfig {
        AutoRemove?: boolean | undefined;
        Binds?: string[] | undefined;
        ContainerIDFile?: string | undefined;
        LogConfig?:
            | {
                Type: string;
                Config: any;
            }
            | undefined;
        NetworkMode?: string | undefined;
        PortBindings?: any;
        RestartPolicy?: HostRestartPolicy | undefined;
        VolumeDriver?: string | undefined;
        VolumesFrom?: any;
        Mounts?: MountConfig | undefined;
        CapAdd?: any;
        CapDrop?: any;
        Dns?: any[] | undefined;
        DnsOptions?: any[] | undefined;
        DnsSearch?: string[] | undefined;
        ExtraHosts?: any;
        GroupAdd?: string[] | undefined;
        IpcMode?: string | undefined;
        Cgroup?: string | undefined;
        Links?: any;
        OomScoreAdj?: number | undefined;
        PidMode?: string | undefined;
        Privileged?: boolean | undefined;
        PublishAllPorts?: boolean | undefined;
        ReadonlyRootfs?: boolean | undefined;
        SecurityOpt?: any;
        StorageOpt?: { [option: string]: string } | undefined;
        Tmpfs?: { [dir: string]: string } | undefined;
        UTSMode?: string | undefined;
        UsernsMode?: string | undefined;
        ShmSize?: number | undefined;
        Sysctls?: { [index: string]: string } | undefined;
        Runtime?: string | undefined;
        ConsoleSize?: number[] | undefined;
        Isolation?: string | undefined;
        MaskedPaths?: string[] | undefined;
        ReadonlyPaths?: string[] | undefined;
        CpuShares?: number | undefined;
        CgroupParent?: string | undefined;
        BlkioWeight?: number | undefined;
        BlkioWeightDevice?: any;
        BlkioDeviceReadBps?: any;
        BlkioDeviceWriteBps?: any;
        BlkioDeviceReadIOps?: any;
        BlkioDeviceWriteIOps?: any;
        CpuPeriod?: number | undefined;
        CpuQuota?: number | undefined;
        CpusetCpus?: string | undefined;
        CpusetMems?: string | undefined;
        Devices?: any;
        DeviceCgroupRules?: string[] | undefined;
        DeviceRequests?: DeviceRequest[] | undefined;
        DiskQuota?: number | undefined;
        KernelMemory?: number | undefined;
        Memory?: number | undefined;
        MemoryReservation?: number | undefined;
        MemorySwap?: number | undefined;
        MemorySwappiness?: number | undefined;
        NanoCpus?: number | undefined;
        OomKillDisable?: boolean | undefined;
        Init?: boolean | undefined;
        PidsLimit?: number | undefined;
        Ulimits?: Ulimit[] | undefined;
        CpuCount?: number | undefined;
        CpuPercent?: number | undefined;
        CpuRealtimePeriod?: number | undefined;
        CpuRealtimeRuntime?: number | undefined;
    }

    interface ImageInspectInfo {
        Id: string;
        RepoTags: string[];
        RepoDigests: string[];
        Parent: string;
        Comment: string;
        Created: string;
        Container: string;
        ContainerConfig: {
            Hostname: string;
            Domainname: string;
            User: string;
            AttachStdin: boolean;
            AttachStdout: boolean;
            AttachStderr: boolean;
            ExposedPorts: { [portAndProtocol: string]: {} };
            Tty: boolean;
            OpenStdin: boolean;
            StdinOnce: boolean;
            Env: string[];
            Cmd: string[];
            ArgsEscaped: boolean;
            Image: string;
            Volumes: { [path: string]: {} };
            WorkingDir: string;
            Entrypoint?: string | string[] | undefined;
            OnBuild?: any[] | undefined;
            Labels: { [label: string]: string };
        };
        DockerVersion: string;
        Author: string;
        Config: {
            Hostname: string;
            Domainname: string;
            User: string;
            AttachStdin: boolean;
            AttachStdout: boolean;
            AttachStderr: boolean;
            ExposedPorts: { [portAndProtocol: string]: {} };
            Tty: boolean;
            OpenStdin: boolean;
            StdinOnce: boolean;
            Env: string[];
            Cmd: string[];
            ArgsEscaped: boolean;
            Image: string;
            Volumes: { [path: string]: {} };
            WorkingDir: string;
            Entrypoint?: string | string[] | undefined;
            OnBuild: any[];
            Labels: { [label: string]: string };
            Healthcheck?: HealthConfig | undefined;
        };
        Architecture: string;
        Variant?: string | undefined;
        Os: string;
        OsVersion?: string | undefined;
        Size: number;
        VirtualSize: number;
        GraphDriver: {
            Name: string;
            Data: {
                DeviceId: string;
                DeviceName: string;
                DeviceSize: string;
            };
        };
        RootFS: {
            Type: string;
            Layers?: string[] | undefined;
            BaseLayer?: string | undefined;
        };
        Descriptor?:
            | {
                mediaType: string;
                digest: string;
                size: number;
                urls?: string[] | undefined;
                annotations?: { [key: string]: string } | undefined;
                data?: string | undefined;
                platform?:
                    | {
                        architecture: string;
                        os: string;
                        "os.version"?: string | undefined;
                        "os.features"?: string[] | undefined;
                        variant?: string | undefined;
                    }
                    | undefined;
                artifactType?: string | undefined;
            }
            | undefined;
        Manifests?:
            | {
                ID: string;
                Descriptor: {
                    mediaType: string;
                    digest: string;
                    size: number;
                    urls?: string[] | undefined;
                    annotations?: { [key: string]: string } | undefined;
                    data?: string | undefined;
                    platform?:
                        | {
                            architecture: string;
                            os: string;
                            "os.version"?: string | undefined;
                            "os.features"?: string[] | undefined;
                            variant?: string | undefined;
                        }
                        | undefined;
                    artifactType?: string | undefined;
                };
                Available: boolean;
                Size: {
                    Total: number;
                    Content: number;
                };
                Kind: "image" | "attestation" | "unknown";
                ImageData?:
                    | {
                        Platform: {
                            architecture: string;
                            os: string;
                            "os.version"?: string | undefined;
                            "os.features"?: string[] | undefined;
                            variant?: string | undefined;
                        };
                        Containers: string[];
                        Size: {
                            Total: number;
                            Content: number;
                        };
                    }
                    | undefined;
                AttestationData?:
                    | {
                        For: string;
                    }
                    | undefined;
            }[]
            | undefined;
    }

    interface ImageBuildOptions {
        authconfig?: AuthConfig | undefined;
        registryconfig?: RegistryConfig | undefined;
        abortSignal?: AbortSignal;

        dockerfile?: string | undefined;
        t?: string | undefined;
        extrahosts?: string | undefined;
        remote?: string | undefined;
        q?: boolean | undefined;
        cachefrom?: string | undefined;
        pull?: boolean | undefined;
        rm?: boolean | undefined;
        forcerm?: boolean | undefined;
        memory?: number | undefined;
        memswap?: number | undefined;
        cpushares?: number | undefined;
        cpusetcpus?: number | undefined;
        cpuperiod?: number | undefined;
        cpuquota?: number | undefined;
        buildargs?: { [key: string]: string } | undefined;
        shmsize?: number | undefined;
        squash?: boolean | undefined;
        labels?: { [key: string]: string } | undefined;
        networkmode?: string | undefined;
        platform?: string | undefined;
        target?: string | undefined;
        outputs?: string | undefined;
        nocache?: boolean | undefined;

        /**
         * Version of the builder backend to use.
         *  - `1` is the first generation classic (deprecated) builder in the Docker daemon (default)
         *  - `2` is [BuildKit](https://github.com/moby/buildkit)
         */
        version?: "1" | "2" | undefined;
    }

    interface ImageDistributionOptions {
        authconfig?: AuthConfig | undefined;
        abortSignal?: AbortSignal;
    }

    interface ImageInspectOptions {
        manifests?: boolean | undefined;
    }

    interface ImagePushOptions {
        tag?: string | undefined;
        authconfig?: AuthConfig | undefined;
        abortSignal?: AbortSignal;
        stream?: boolean | undefined;
    }

    interface ImageTagOptions {
        abortSignal?: AbortSignal;
        /**
         * The repository to tag in. For example, someuser/someimage.
         */
        repo: string;
        /**
         * The name of the new tag.
         */
        tag?: string;
    }

    interface AuthConfigKey {
        key: string;
    }
    interface AuthConfigBase64 {
        base64: string;
    }
    interface AuthConfigObject {
        username?: string;
        password?: string;
        auth?: string;
        serveraddress?: string;
        identitytoken?: string;
        registrytoken?: string;
        /** @deprecated */
        email?: string | undefined;
    }

    type AuthConfig = AuthConfigKey | AuthConfigBase64 | AuthConfigObject;

    interface RegistryConfig {
        [registryAddress: string]: {
            username: string;
            password: string;
        };
    }

    interface PortBinding {
        HostIp?: string | undefined;
        HostPort?: string | undefined;
    }

    interface PortMap {
        [key: string]: PortBinding[];
    }

    interface HostRestartPolicy {
        Name: string;
        MaximumRetryCount?: number | undefined;
    }

    type LoggingDriverType =
        | "json-file"
        | "syslog"
        | "journald"
        | "gelf"
        | "fluentd"
        | "awslogs"
        | "splunk"
        | "etwlogs"
        | "none";

    interface LogConfig {
        Type: LoggingDriverType;
        Config?: { [key: string]: string } | undefined;
    }

    interface DeviceMapping {
        PathOnHost: string;
        PathInContainer: string;
        CgroupPermissions: string;
    }

    interface DeviceRequest {
        Driver?: string | undefined;
        Count?: number | undefined;
        DeviceIDs?: string[] | undefined;
        Capabilities?: string[][] | undefined;
        Options?: { [key: string]: string } | undefined;
    }

    /* tslint:disable:interface-name */
    interface IPAMConfig {
        IPv4Address?: string | undefined;
        IPv6Address?: string | undefined;
        LinkLocalIPs?: string[] | undefined;
    }
    /* tslint:enable:interface-name */

    interface EndpointSettings {
        IPAMConfig?: IPAMConfig | undefined;
        Links?: string[] | undefined;
        Aliases?: string[] | undefined;
        NetworkID?: string | undefined;
        EndpointID?: string | undefined;
        Gateway?: string | undefined;
        IPAddress?: string | undefined;
        IPPrefixLen?: number | undefined;
        IPv6Gateway?: string | undefined;
        GlobalIPv6Address?: string | undefined;
        GlobalIPV6PrefixLen?: number | undefined;
        MacAddress?: string | undefined;
        DriverOpts?: { [key: string]: string } | undefined;
    }

    interface EndpointsConfig {
        [key: string]: EndpointSettings;
    }

    interface ExecCreateOptions {
        AttachStdin?: boolean | undefined;
        AttachStdout?: boolean | undefined;
        AttachStderr?: boolean | undefined;
        DetachKeys?: string | undefined;
        Tty?: boolean | undefined;
        Env?: string[] | undefined;
        Cmd?: string[] | undefined;
        Privileged?: boolean | undefined;
        User?: string | undefined;
        WorkingDir?: string | undefined;
        abortSignal?: AbortSignal;
        ConsoleSize?: [number, number];
    }

    interface ExecInspectInfo {
        CanRemove: boolean;
        DetachKeys: string;
        ID: string;
        Running: boolean;
        ExitCode: number | null;
        ProcessConfig: {
            privileged: boolean;
            user: string;
            tty: boolean;
            entrypoint: string;
            arguments: string[];
        };
        OpenStdin: boolean;
        OpenStderr: boolean;
        OpenStdout: boolean;
        ContainerID: string;
        Pid: number;
    }

    interface ExecInspectOptions {
        abortSignal?: AbortSignal;
    }

    interface ExecStartOptions {
        // hijack and stdin are used by docker-modem
        hijack?: boolean | undefined;
        stdin?: boolean | undefined;
        // Detach and Tty are used by Docker's API
        Detach?: boolean | undefined;
        Tty?: boolean | undefined;
        abortSignal?: AbortSignal;
    }

    type MountType = "bind" | "volume" | "tmpfs" | "image";

    type MountConsistency = "default" | "consistent" | "cached" | "delegated";

    type MountPropagation = "private" | "rprivate" | "shared" | "rshared" | "slave" | "rslave";

    interface MountSettings {
        Target: string;
        Source: string;
        Type: MountType;
        ReadOnly?: boolean | undefined;
        Consistency?: MountConsistency | undefined;
        BindOptions?:
            | {
                Propagation: MountPropagation;
            }
            | undefined;
        VolumeOptions?:
            | {
                NoCopy: boolean;
                Labels: { [label: string]: string };
                DriverConfig: {
                    Name: string;
                    Options: { [option: string]: string };
                };
                Subpath?: string;
            }
            | undefined;
        TmpfsOptions?:
            | {
                SizeBytes: number;
                Mode: number;
            }
            | undefined;
        ImageOptions?:
            | {
                Subpath?: string;
            }
            | undefined;
    }

    type MountConfig = MountSettings[];

    interface ContainerCreateOptions {
        name?: string | undefined;
        platform?: string | undefined;
        Hostname?: string | undefined;
        Domainname?: string | undefined;
        User?: string | undefined;
        ArgsEscaped?: boolean | undefined;
        AttachStdin?: boolean | undefined;
        AttachStdout?: boolean | undefined;
        AttachStderr?: boolean | undefined;
        Tty?: boolean | undefined;
        OpenStdin?: boolean | undefined;
        StdinOnce?: boolean | undefined;
        Env?: string[] | undefined;
        Cmd?: string[] | undefined;
        Entrypoint?: string | string[] | undefined;
        Image?: string | undefined;
        Labels?: { [label: string]: string } | undefined;
        Volumes?: { [volume: string]: {} } | undefined;
        WorkingDir?: string | undefined;
        NetworkDisabled?: boolean | undefined;
        MacAddress?: string | undefined;
        ExposedPorts?: { [port: string]: {} } | undefined;
        StopSignal?: string | undefined;
        StopTimeout?: number | undefined;
        Healthcheck?: HealthConfig | undefined;
        HostConfig?: HostConfig | undefined;
        OnBuild?: string[] | undefined;
        Shell?: string[] | undefined;
        NetworkingConfig?:
            | {
                EndpointsConfig?: EndpointsConfig | undefined;
            }
            | undefined;
        abortSignal?: AbortSignal;
    }

    interface ContainerInspectOptions {
        abortSignal?: AbortSignal;
    }

    interface ContainerStartOptions {
        detachKeys?: string;
        abortSignal?: AbortSignal;
    }

    interface ContainerRemoveOptions {
        v?: boolean | undefined;
        force?: boolean | undefined;
        link?: boolean | undefined;
    }

    interface KeyObject {
        pem: string | Buffer;
        passphrase?: string | undefined;
    }

    interface DockerOptions {
        socketPath?: string | undefined;
        host?: string | undefined;
        port?: number | string | undefined;
        username?: string | undefined;
        headers?: { [name: string]: string };
        ca?: string | string[] | Buffer | Buffer[] | undefined;
        cert?: string | string[] | Buffer | Buffer[] | undefined;
        key?: string | string[] | Buffer | Buffer[] | KeyObject[] | undefined;
        protocol?: "https" | "http" | "ssh" | undefined;
        timeout?: number | undefined;
        version?: string | undefined;
        sshAuthAgent?: string | undefined;
        sshOptions?: ConnectConfig | undefined;
        Promise?: typeof Promise | undefined;
    }

    interface GetEventsOptions {
        since?: number | undefined;
        until?: number | undefined;
        filters?:
            | string
            | {
                config?: string | undefined;
                container?: string[] | undefined;
                daemon?: string[] | undefined;
                event?: string[] | undefined;
                image?: string[] | undefined;
                label?: string[] | undefined;
                network?: string[] | undefined;
                node?: string[] | undefined;
                plugin?: string[] | undefined;
                scope?: Array<"local" | "swarm"> | undefined;
                secret?: string[] | undefined;
                service?: string[] | undefined;
                type?:
                    | Array<
                        | "container"
                        | "image"
                        | "volume"
                        | "network"
                        | "daemon"
                        | "plugin"
                        | "service"
                        | "node"
                        | "secret"
                        | "config"
                    >
                    | undefined;
                volume?: string[] | undefined;
            }
            | undefined;
        abortSignal?: AbortSignal;
    }

    interface SecretVersion {
        Index: number;
    }

    interface Annotations {
        Name?: string | undefined;
        Labels?: { [name: string]: string } | undefined;
    }

    interface ResourceLimits {
        NanoCPUs?: number | undefined;
        MemoryBytes?: number | undefined;
        Pids?: number | undefined;
    }

    interface NamedGenericResource {
        Kind?: string | undefined;
        Value?: string | undefined;
    }

    interface DiscreteGenericResource {
        Kind?: string | undefined;
        Value?: number | undefined;
    }

    type GenericResource = NamedGenericResource | DiscreteGenericResource;

    interface TaskRestartPolicy {
        Condition?: string | undefined;
        Delay?: number | undefined;
        MaxAttempts?: number | undefined;
        Window?: number | undefined;
    }

    interface Resources {
        NanoCPUs?: number | undefined;
        MemoryBytes?: number | undefined;
        GenericResources?: GenericResource[] | undefined;
    }

    interface ResourceRequirements {
        Limits?: ResourceLimits | undefined;
        Reservations?: Resources | undefined;
    }

    interface Placement {
        Constraints?: string[] | undefined;
        Preferences?: Array<{ Spread: { SpreadDescriptor: string } }> | undefined;
        MaxReplicas?: number | undefined;
        Platforms?:
            | Array<{
                Architecture: string;
                OS: string;
            }>
            | undefined;
    }

    interface NetworkAttachmentConfig {
        Target?: string | undefined;
        Aliases?: string[] | undefined;
        DriverOpts?: { [key: string]: string } | undefined;
    }

    interface Privileges {
        CredentialSpec?:
            | {
                Config?: string | undefined;
                File?: string | undefined;
                Registry?: string | undefined;
            }
            | undefined;
        SELinuxContext?:
            | {
                Disable?: boolean | undefined;
                User?: string | undefined;
                Role?: string | undefined;
                Type?: string | undefined;
                Level?: string | undefined;
            }
            | undefined;
    }

    interface HealthConfig {
        Test?: string[] | undefined;
        Interval?: number | undefined;
        Timeout?: number | undefined;
        StartPeriod?: number | undefined;
        StartInterval?: number | undefined;
        Retries?: number | undefined;
    }

    interface DNSConfig {
        Nameservers?: string[] | undefined;
        Search?: string[] | undefined;
        Options?: string[] | undefined;
    }

    interface ConfigReference {
        File?:
            | {
                Name?: string | undefined;
                UID?: string | undefined;
                GID?: string | undefined;
                Mode: number | undefined;
            }
            | undefined;
        ConfigID?: string | undefined;
        ConfigName?: string | undefined;
    }

    interface SecretReference {
        File?:
            | {
                Name?: string | undefined;
                UID?: string | undefined;
                GID?: string | undefined;
                Mode?: number | undefined;
            }
            | undefined;
        SecretID?: string | undefined;
        SecretName?: string | undefined;
    }

    interface Ulimit {
        Name?: string | undefined;
        Hard?: number | undefined;
        Soft?: number | undefined;
    }

    interface ContainerSpec {
        Image?: string | undefined;
        Labels?: { [label: string]: string } | undefined;
        Command?: string[] | undefined;
        Args?: string[] | undefined;
        Hostname?: string | undefined;
        Env?: string[] | undefined;
        Dir?: string | undefined;
        User?: string | undefined;
        Groups?: string[] | undefined;
        Privileges?: Privileges | undefined;
        Init?: boolean | undefined;
        TTY?: boolean | undefined;
        OpenStdin?: boolean | undefined;
        ReadOnly?: boolean | undefined;
        Mounts?: MountSettings[] | undefined;
        StopSignal?: string | undefined;
        StopGracePeriod?: number | undefined;
        HealthCheck?: HealthConfig | undefined;
        Hosts?: string[] | undefined;
        DNSConfig?: DNSConfig | undefined;
        Configs?: ConfigReference[] | undefined;
        Secrets?: SecretReference[] | undefined;
        Isolation?: string | undefined;
        Sysctls?: { [key: string]: string } | undefined;
        CapabilityAdd?: string[] | undefined;
        CapabilityDrop?: string[] | undefined;
        Ulimits?: Ulimit[] | undefined;
    }

    interface PluginSpec {
        Name?: string | undefined;
        Remote?: string | undefined;
        Privileges?:
            | {
                Name?: string | undefined;
                Description?: string | undefined;
                Value?: string[] | undefined;
            }
            | undefined;
        Disabled?: boolean | undefined;
        Env?: string[] | undefined;
    }

    interface TaskSpecBase {
        Resources?: ResourceRequirements | undefined;
        RestartPolicy?: TaskRestartPolicy | undefined;
        Placement?: Placement | undefined;
        Networks?: NetworkAttachmentConfig[] | undefined;
        LogDriver?:
            | {
                Name?: string | undefined;
                Options?: { [key: string]: string } | undefined;
            }
            | undefined;
        ForceUpdate?: number | undefined;
        Runtime?: string | undefined;
    }

    interface ContainerTaskSpec extends TaskSpecBase {
        ContainerSpec?: ContainerSpec | undefined;
    }

    interface PluginTaskSpec extends TaskSpecBase {
        Runtime: "plugin";
        PluginSpec: PluginSpec;
    }

    interface NetworkAttachmentTaskSpec extends TaskSpecBase {
        Runtime: "attachment";
        NetworkAttachmentSpec: {
            ContainerID: string;
        };
    }

    type TaskSpec = ContainerTaskSpec | PluginTaskSpec | NetworkAttachmentTaskSpec;

    interface ServiceMode {
        Replicated?: { Replicas?: number | undefined } | undefined;
        Global?: {} | undefined;
        ReplicatedJob?:
            | {
                MaxConcurrent?: number | undefined;
                TotalCompletions?: number | undefined;
            }
            | undefined;
        GlobalJob?: {} | undefined;
    }

    interface UpdateConfig {
        Parallelism: number;
        Delay?: number | undefined;
        FailureAction?: string | undefined;
        Monitor?: number | undefined;
        MaxFailureRatio?: number | undefined;
        Order: string;
    }

    interface PortConfig {
        Name?: string | undefined;
        Protocol?: "tcp" | "udp" | "sctp" | undefined;
        TargetPort?: number | undefined;
        PublishedPort?: number | undefined;
        PublishMode?: "ingress" | "host" | undefined;
    }

    interface EndpointSpec {
        Mode?: string | undefined;
        Ports?: PortConfig[] | undefined;
    }

    interface EndpointVirtualIP {
        NetworkID?: string | undefined;
        Addr?: string | undefined;
    }

    interface Endpoint {
        Spec?: EndpointSpec | undefined;
        Ports?: PortConfig[] | undefined;
        VirtualIPs?: EndpointVirtualIP[] | undefined;
    }

    interface ServiceSpec extends Annotations {
        TaskTemplate?: TaskSpec | undefined;
        Mode?: ServiceMode | undefined;
        UpdateConfig?: UpdateConfig | undefined;
        RollbackConfig?: UpdateConfig | undefined;
        Networks?: NetworkAttachmentConfig[] | undefined;
        EndpointSpec?: EndpointSpec | undefined;
    }

    interface CreateServiceOptions extends ServiceSpec {
        authconfig?: AuthConfig | undefined;
        abortSignal?: AbortSignal;
    }

    interface ContainerListOptions {
        abortSignal?: AbortSignal;
        /**
         * Return all containers. By default, only running containers are shown
         * @default false
         */
        all?: boolean;
        /**
         * Return this number of most recently created containers, including non-running ones.
         */
        limit?: number;
        /**
         * Return the size of container as fields `SizeRw` and `SizeRootFs`.
         * @default false
         */
        size?: boolean;
        /**
         * Filters to process on the container list, encoded as JSON (a map[string][]string).
         * A dictionary of key/value list is also accepted.
         */
        filters?: string | { [key: string]: string[] };
    }

    interface ServiceListOptions {
        filters?:
            | {
                id?: string[] | undefined;
                label?: string[] | undefined;
                mode?: Array<"replicated" | "global"> | undefined;
                name?: string[] | undefined;
            }
            | string
            | undefined;
        status?: boolean | undefined;
        abortSignal?: AbortSignal;
    }

    interface Version {
        Index?: number | undefined;
    }

    interface Meta {
        Version?: Version | undefined;
        CreatedAt?: string | undefined;
        UpdatedAt?: string | undefined;
    }

    type UpdateState =
        | "updating"
        | "paused"
        | "completed"
        | "rollback_started"
        | "rollback_paused"
        | "rollback_completed";

    interface UpdateStatus {
        State?: UpdateState | undefined;
        StartedAt?: string | undefined;
        CompletedAt?: string | undefined;
        Message?: string | undefined;
    }

    interface ServiceStatus {
        RunningTasks: number;
        DesiredTasks: number;
        CompletedTasks: number;
    }

    interface JobStatus {
        JobIteration: Version;
        LastExecution?: string | undefined;
    }

    interface Service extends Meta {
        ID: string;
        Spec?: ServiceSpec | undefined;
        PreviousSpec?: ServiceSpec | undefined;
        Endpoint?: Endpoint | undefined;
        UpdateStatus?: UpdateStatus | undefined;
        ServiceStatus?: ServiceStatus | undefined;
        JobStatus?: JobStatus | undefined;
    }

    interface OrchestrationConfig {
        TaskHistoryRetentionLimit?: number | undefined;
    }

    interface RaftConfig {
        SnapshotInterval?: number | undefined;
        KeepOldSnapshots?: number | undefined;
        LogEntriesForSlowFollowers?: number | undefined;
        ElectionTick?: number | undefined;
        HeartbeatTick?: number | undefined;
    }

    interface DispatcherConfig {
        HeartbeatPeriod?: Duration | undefined;
    }

    type ExternalCAProtocol = "cfssl" | string;

    interface ExternalCA {
        Protocol: ExternalCAProtocol;
        URL: string;
        Options?: { [key: string]: string } | undefined;
        CACert: string;
    }

    interface CAConfig {
        NodeCertExpiry?: Duration | undefined;
        ExternalCAs?: ExternalCA[] | undefined;
        SigningCACert?: string | undefined;
        SigningCAKey?: string | undefined;
        ForceRotate?: number | undefined;
    }

    interface TaskDefaults {
        LogDriver?: Driver | undefined;
    }

    interface EncryptionConfig {
        AutoLockManagers: boolean;
    }

    interface Spec extends Annotations {
        Orchestration?: OrchestrationConfig | undefined;
        Raft: RaftConfig;
        Dispatcher?: DispatcherConfig | undefined;
        CAConfig?: CAConfig | undefined;
        TaskDefaults?: TaskDefaults | undefined;
        EncryptionConfig?: EncryptionConfig | undefined;
    }

    interface TLSInfo {
        TrustRoot?: string | undefined;
        CertIssuerSubject?: string | undefined;
        CertIssuerPublicKey?: string | undefined;
    }

    interface ClusterInfo extends Meta {
        ID: string;
        Spec: Spec;
        TLSInfo: TLSInfo;
        RootRotationInProgress: boolean;
        DefaultAddrPool: string[];
        SubnetSize: number;
        DataPathPort: number;
    }

    interface JoinTokens {
        Worker: string;
        Manager: string;
    }

    interface Swarm extends ClusterInfo {
        JoinTokens: JoinTokens;
    }

    interface Driver {
        Name: string;
        Options?: { [key: string]: string } | undefined;
    }

    interface SecretSpec extends Annotations {
        Data?: string | undefined;
        Driver?: Driver | undefined;
        Templating?: Driver | undefined;
    }

    interface Secret extends Meta {
        ID: string;
        Spec?: SecretSpec | undefined;
    }

    interface ConfigInfo {
        ID: string;
        Version: SecretVersion;
        CreatedAt: string;
        UpdatedAt?: string | undefined;
        Spec?: ConfigSpec | undefined;
    }

    interface ConfigSpec {
        Name: string;
        Labels: { [label: string]: string };
        Data: string;
    }

    interface ConfigVersion {
        Index: number;
    }

    interface PluginInfo {
        Id?: string | undefined;
        Name: string;
        Enabled: boolean;
        Settings: PluginSettings;
        PluginReference?: string | undefined;
        Config: PluginConfig;
    }

    type PluginInspectInfo = PluginInfo;

    interface PluginSettings {
        Mounts: PluginMount[];
        Env: string[];
        Args: string[];
        Devices: PluginDevice[];
    }

    interface PluginConfig {
        Description: string;
        Documentation: string;
        Interface: any;
        Entrypoint: string[];
        WorkDir: string;
        User?: User | undefined;
        Network: Network;
        Linux: Linux;
        PropagatedMount: string;
        Mounts: PluginMount[];
        Env: PluginEnv[];
        Args: Args;
        rootfs: any;
    }

    interface Interface {
        Types: PluginInterfaceType[];
        Socket: string;
    }

    interface PluginInterfaceType {
        Prefix: string;
        Capability: string;
        Version: string;
    }

    interface PluginMount {
        Name: string;
        Description: string;
        Settable: string[];
        Source: string;
        Destination: string;
        Type: string;
        Options: string[];
    }

    interface Linux {
        Capabilities: string[];
        AllowAllDevices: boolean;
        Devices: PluginDevice[];
    }

    interface PluginDevice {
        Name: string;
        Description: string;
        Settable: string[];
        Path: string;
    }

    interface Network {
        Type: string;
    }

    interface PluginEnv {
        Name: string;
        Description: string;
        Settable: string[];
        Value: string;
    }

    interface Args {
        Name: string;
        Description: string;
        Settable: string[];
        Value: string;
    }

    interface User {
        UID: number;
        GID: number;
    }

    interface ListImagesOptions {
        all?: boolean | undefined;
        filters?: string | { [key: string]: string[] } | undefined;
        digests?: boolean | undefined;
        manifests?: boolean | undefined;
        abortSignal?: AbortSignal;
    }

    interface ImageDistributionPlatformInfo {
        architecture: string;
        os: string;
        "os.version": string;
        "os.features": string[];
        variant: string;
    }

    interface ImageDistributionDescriptorInfo {
        mediaType: string;
        digest: string;
        size: number;
    }

    interface ImageDistributionInfo {
        Descriptor: ImageDistributionDescriptorInfo;
        Platforms: ImageDistributionPlatformInfo[];
    }

    interface ImageRemoveInfo {
        Untagged: string;
        Deleted: string;
    }

    interface ImageRemoveOptions {
        force?: boolean | undefined;
        noprune?: boolean | undefined;
        abortSignal?: AbortSignal;
    }

    interface PruneImagesInfo {
        ImagesDeleted: ImageRemoveInfo[];
        SpaceReclaimed: number;
    }

    interface PruneBuilderOptions {
        abortSignal?: AbortSignal;
    }

    interface PruneBuilderInfo {
        SpaceReclaimed: number;
    }

    interface PruneVolumesInfo {
        VolumesDeleted: string[];
        SpaceReclaimed: number;
    }

    interface PruneContainersInfo {
        ContainersDeleted: string[];
        SpaceReclaimed: number;
    }

    interface PruneNetworksInfo {
        NetworksDeleted: string[];
    }

    interface ContainerWaitOptions {
        /** Since v1.30 */
        condition?: "not-running" | "next-exit" | "removed" | undefined;
        abortSignal?: AbortSignal;
    }

    interface ContainerLogsOptions {
        stdout?: boolean | undefined;
        stderr?: boolean | undefined;
        follow?: boolean | undefined;
        since?: number | string | undefined;
        until?: number | string | undefined;
        details?: boolean | undefined;
        tail?: number | undefined;
        timestamps?: boolean | undefined;
        abortSignal?: AbortSignal;
    }

    interface ContainerAttachOptions {
        detachKeys?: string | undefined;
        hijack?: boolean | undefined;
        logs?: boolean | undefined;
        stream?: boolean | undefined;
        stdin?: boolean | undefined;
        stdout?: boolean | undefined;
        stderr?: boolean | undefined;
        abortSignal?: AbortSignal;
    }

    interface ContainerStopOptions {
        signal?: string;
        /** Number of seconds to wait before killing the container */
        t?: number;
        abortSignal?: AbortSignal;
    }

    interface ImageBuildContext {
        context: string;
        src: string[];
    }

    interface DockerVersion {
        ApiVersion: string;
        Arch: string;
        BuildTime: Date;
        Components: Array<{
            Details: {
                ApiVersion: string;
                Arch: string;
                BuildTime: Date;
                Experimental: string;
                GitCommit: string;
                GoVersion: string;
                KernelVersion: string;
                Os: string;
            };
            Name: string;
            Version: string;
        }>;
        GitCommit: string;
        GoVersion: string;
        KernelVersion: string;
        MinAPIVersion: string;
        Os: string;
        Platform: {
            Name: string;
        };
        Version: string;
    }
}

type Callback<T> = (error?: any, result?: T) => void;

declare class Dockerode {
    constructor(options?: Dockerode.DockerOptions);

    createContainer(options: Dockerode.ContainerCreateOptions, callback: Callback<Dockerode.Container>): void;
    createContainer(options: Dockerode.ContainerCreateOptions): Promise<Dockerode.Container>;

    createImage(options: {}, callback: Callback<NodeJS.ReadableStream>): void;
    createImage(auth: any, options: {}, callback: Callback<NodeJS.ReadableStream>): void;
    createImage(options: {}): Promise<NodeJS.ReadableStream>;
    createImage(auth: any, options: {}): Promise<NodeJS.ReadableStream>;

    loadImage(file: string | NodeJS.ReadableStream, options: {}, callback: Callback<NodeJS.ReadableStream>): void;
    loadImage(file: string | NodeJS.ReadableStream, callback: Callback<NodeJS.ReadableStream>): void;
    loadImage(file: string | NodeJS.ReadableStream, options?: {}): Promise<NodeJS.ReadableStream>;

    importImage(file: string | NodeJS.ReadableStream, options: {}, callback: Callback<NodeJS.ReadableStream>): void;
    importImage(file: string | NodeJS.ReadableStream, callback: Callback<NodeJS.ReadableStream>): void;
    importImage(file: string | NodeJS.ReadableStream, options?: {}): Promise<NodeJS.ReadableStream>;

    checkAuth(options: any, callback: Callback<any>): void;
    checkAuth(options: any): Promise<any>;

    buildImage(
        file: string | NodeJS.ReadableStream | Dockerode.ImageBuildContext,
        options: Dockerode.ImageBuildOptions,
        callback: Callback<NodeJS.ReadableStream>,
    ): void;
    buildImage(
        file: string | NodeJS.ReadableStream | Dockerode.ImageBuildContext,
        callback: Callback<NodeJS.ReadableStream>,
    ): void;
    buildImage(
        file: string | NodeJS.ReadableStream | Dockerode.ImageBuildContext,
        options?: Dockerode.ImageBuildOptions,
    ): Promise<NodeJS.ReadableStream>;

    getContainer(id: string): Dockerode.Container;

    getImage(name: string): Dockerode.Image;

    getVolume(name: string): Dockerode.Volume;

    getPlugin(name: string, remote: any): Dockerode.Plugin;

    getService(id: string): Dockerode.Service;

    getTask(id: string): Dockerode.Task;

    getNode(id: string): Dockerode.Node;

    getNetwork(id: string): Dockerode.Network;

    getSecret(id: string): Dockerode.Secret;

    getExec(id: string): Dockerode.Exec;

    getConfig(id: string): Dockerode.Config;

    listContainers(options: Dockerode.ContainerListOptions, callback: Callback<Dockerode.ContainerInfo[]>): void;
    listContainers(callback: Callback<Dockerode.ContainerInfo[]>): void;
    listContainers(options?: Dockerode.ContainerListOptions): Promise<Dockerode.ContainerInfo[]>;

    listImages(options: Dockerode.ListImagesOptions, callback: Callback<Dockerode.ImageInfo[]>): void;
    listImages(callback: Callback<Dockerode.ImageInfo[]>): void;
    listImages(options?: Dockerode.ListImagesOptions): Promise<Dockerode.ImageInfo[]>;

    listServices(options: Dockerode.ServiceListOptions, callback: Callback<Dockerode.Service[]>): void;
    listServices(callback: Callback<Dockerode.Service[]>): void;
    listServices(options?: Dockerode.ServiceListOptions): Promise<Dockerode.Service[]>;

    listNodes(options: Dockerode.NodeListOptions, callback: Callback<any[]>): void;
    listNodes(callback: Callback<any[]>): void;
    listNodes(options?: Dockerode.NodeListOptions): Promise<any[]>;

    listTasks(options: {}, callback: Callback<any[]>): void;
    listTasks(callback: Callback<any[]>): void;
    listTasks(options?: {}): Promise<any[]>;

    listSecrets(options: {}, callback: Callback<Dockerode.Secret[]>): void;
    listSecrets(callback: Callback<Dockerode.Secret[]>): void;
    listSecrets(options?: {}): Promise<Dockerode.Secret[]>;

    listPlugins(options: {}, callback: Callback<Dockerode.PluginInfo[]>): void;
    listPlugins(callback: Callback<Dockerode.PluginInfo[]>): void;
    listPlugins(options?: {}): Promise<Dockerode.PluginInfo[]>;

    listVolumes(
        options: Dockerode.VolumeListOptions,
        callback: Callback<{
            Volumes: Dockerode.VolumeInspectInfo[];
            Warnings: string[];
        }>,
    ): void;
    listVolumes(
        callback: Callback<{
            Volumes: Dockerode.VolumeInspectInfo[];
            Warnings: string[];
        }>,
    ): void;
    listVolumes(options?: Dockerode.VolumeListOptions): Promise<{
        Volumes: Dockerode.VolumeInspectInfo[];
        Warnings: string[];
    }>;

    listNetworks(options: Dockerode.NetworkListOptions, callback: Callback<Dockerode.NetworkInspectInfo[]>): void;
    listNetworks(callback: Callback<Dockerode.NetworkInspectInfo[]>): void;
    listNetworks(options?: Dockerode.NetworkListOptions): Promise<Dockerode.NetworkInspectInfo[]>;

    listConfigs(options: {}, callback: Callback<Dockerode.ConfigInfo[]>): void;
    listConfigs(callback: Callback<Dockerode.ConfigInfo[]>): void;
    listConfigs(options?: {}): Promise<Dockerode.ConfigInfo[]>;

    createSecret(options: {}, callback: Callback<any>): void;
    createSecret(options: {}): Promise<any>;

    createConfig(options: {}, callback: Callback<any>): void;
    createConfig(options: {}): Promise<any>;

    createPlugin(options: {}, callback: Callback<any>): void;
    createPlugin(options: {}): Promise<any>;

    createVolume(options: Dockerode.VolumeCreateOptions, callback: Callback<Dockerode.Volume>): void;
    createVolume(callback: Callback<Dockerode.Volume>): void;
    createVolume(options?: Dockerode.VolumeCreateOptions): Promise<Dockerode.VolumeCreateResponse>;

    createService(options: Dockerode.CreateServiceOptions, callback: Callback<Dockerode.Service>): void;
    createService(options: Dockerode.CreateServiceOptions): Promise<Dockerode.Service>;
    createService(auth: Dockerode.AuthConfig, options: Dockerode.ServiceSpec): Promise<Dockerode.Service>;

    createNetwork(options: Dockerode.NetworkCreateOptions, callback: Callback<Dockerode.Network>): void;
    createNetwork(options: Dockerode.NetworkCreateOptions): Promise<Dockerode.Network>;

    searchImages(options: {}, callback: Callback<any>): void;
    searchImages(options: {}): Promise<any>;

    pruneImages(options: {}, callback: Callback<Dockerode.PruneImagesInfo>): void;
    pruneImages(callback: Callback<Dockerode.PruneImagesInfo>): void;
    pruneImages(options?: {}): Promise<Dockerode.PruneImagesInfo>;

    pruneBuilder(options: Dockerode.PruneBuilderOptions, callback: Callback<Dockerode.PruneBuilderInfo>): void;
    pruneBuilder(callback: Callback<Dockerode.PruneBuilderInfo>): void;
    pruneBuilder(options?: Dockerode.PruneBuilderOptions): Promise<Dockerode.PruneBuilderInfo>;

    pruneContainers(options: {}, callback: Callback<Dockerode.PruneContainersInfo>): void;
    pruneContainers(callback: Callback<Dockerode.PruneContainersInfo>): void;
    pruneContainers(options?: {}): Promise<Dockerode.PruneContainersInfo>;

    pruneVolumes(options: Dockerode.VolumePruneOptions, callback: Callback<Dockerode.PruneVolumesInfo>): void;
    pruneVolumes(callback: Callback<Dockerode.PruneVolumesInfo>): void;
    pruneVolumes(options?: Dockerode.VolumePruneOptions): Promise<Dockerode.PruneVolumesInfo>;

    pruneNetworks(options: {}, callback: Callback<Dockerode.PruneNetworksInfo>): void;
    pruneNetworks(callback: Callback<Dockerode.PruneNetworksInfo>): void;
    pruneNetworks(options?: {}): Promise<Dockerode.PruneNetworksInfo>;

    info(callback: Callback<any>): void;
    info(): Promise<any>;

    df(callback: Callback<any>): void;
    df(): Promise<any>;

    version(callback: Callback<Dockerode.DockerVersion>): void;
    version(): Promise<Dockerode.DockerVersion>;

    ping(callback: Callback<any>): void;
    ping(): Promise<any>;

    getEvents(options: Dockerode.GetEventsOptions, callback: Callback<NodeJS.ReadableStream>): void;
    getEvents(callback: Callback<NodeJS.ReadableStream>): void;
    getEvents(options?: Dockerode.GetEventsOptions): Promise<NodeJS.ReadableStream>;

    pull(repoTag: string, options: {}, callback: Callback<NodeJS.ReadableStream>, auth?: {}): Dockerode.Image;
    pull(repoTag: string, options?: {}): Promise<NodeJS.ReadableStream>;

    run(
        image: string,
        cmd: string[],
        outputStream: NodeJS.WritableStream | NodeJS.WritableStream[],
        createOptions: Dockerode.ContainerCreateOptions,
        startOptions: Dockerode.ContainerStartOptions,
        callback: Callback<any>,
    ): events.EventEmitter;
    run(
        image: string,
        cmd: string[],
        outputStream: NodeJS.WritableStream | NodeJS.WritableStream[],
        createOptions: Dockerode.ContainerCreateOptions,
        callback: Callback<any>,
    ): events.EventEmitter;
    run(
        image: string,
        cmd: string[],
        outputStream: NodeJS.WritableStream | NodeJS.WritableStream[],
        callback: Callback<any>,
    ): events.EventEmitter;
    run(
        image: string,
        cmd: string[],
        outputStream: NodeJS.WritableStream | NodeJS.WritableStream[],
        createOptions?: Dockerode.ContainerCreateOptions,
        startOptions?: Dockerode.ContainerStartOptions,
    ): Promise<any>;

    swarmInit(options: {}, callback: Callback<any>): void;
    swarmInit(options: {}): Promise<any>;

    swarmJoin(options: {}, callback: Callback<any>): void;
    swarmJoin(options: {}): Promise<any>;

    swarmLeave(options: {}, callback: Callback<any>): void;
    swarmLeave(options: {}): Promise<any>;

    swarmUpdate(options: {}, callback: Callback<any>): void;
    swarmUpdate(options: {}): Promise<any>;

    swarmInspect(callback: Callback<any>): void;
    swarmInspect(): Promise<any>;

    modem: DockerModem;
}

export = Dockerode;
