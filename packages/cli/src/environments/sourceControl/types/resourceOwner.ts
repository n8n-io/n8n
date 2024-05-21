export type ResourceOwner =
	| string
	| {
			type: 'personal';
			personalEmail: string;
	  }
	| {
			type: 'team';
			teamId: string;
			teamName: string;
	  };
