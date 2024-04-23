export type ResourceOwner =
	| string
	| {
			type: 'personal';
			// personalFirstName: string | null;
			// personalLastName: string | null;
			personalEmail: string;
	  }
	| {
			type: 'team';
			teamId: string;
			teamName: string;
	  };
