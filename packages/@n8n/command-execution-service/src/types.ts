export interface VolumeMetadata {
	id: string;
	name: string;
	createdAt: string;
}

export interface CreateVolumeRequest {
	name?: string;
}

export interface CreateVolumeResponse {
	id: string;
	name: string;
	createdAt: string;
}

export interface ListVolumesResponse {
	volumes: VolumeMetadata[];
}

export interface VolumeMount {
	/** ID of an existing volume */
	volumeId: string;
	/** Absolute path inside the sandbox where this volume is mounted */
	mountPath: string;
	/** If true, volume is mounted read-only and not synced back after execution */
	readOnly?: boolean;
}

export interface ExecuteCommandRequest {
	command: string;
	volumes?: VolumeMount[];
	timeoutMs?: number;
	env?: Record<string, string>;
}

export interface ExecuteCommandResponse {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface S3Object {
	key: string;
	size: number;
	lastModified?: Date;
}
