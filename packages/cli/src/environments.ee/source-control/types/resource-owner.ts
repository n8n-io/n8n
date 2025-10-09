export type RemoteResourceOwner =
	| string
	| {
			type: 'personal';
			projectId?: string; // Optional for retrocompatibility
			projectName?: string; // Optional for retrocompatibility
			personalEmail: string;
	  }
	| {
			type: 'team';
			teamId: string;
			teamName: string;
	  };

export type StatusResourceOwner = {
	type: 'personal' | 'team';
	projectId: string;
	projectName: string;
};
