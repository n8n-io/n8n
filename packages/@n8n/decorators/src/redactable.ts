import { UnexpectedError } from 'n8n-workflow';

type UserLike = {
	id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	role: {
		slug: string;
	};
};

export class RedactableError extends UnexpectedError {
	constructor(fieldName: string, args: string) {
		super(
			`Failed to find "${fieldName}" property in argument "${args.toString()}". Please set the decorator \`@Redactable()\` only on \`LogStreamingEventRelay\` methods where the argument contains a "${fieldName}" property.`,
		);
	}
}

function toRedactable(userLike: UserLike) {
	return {
		userId: userLike.id,
		_email: userLike.email,
		_firstName: userLike.firstName,
		_lastName: userLike.lastName,
		globalRole: userLike.role.slug,
	};
}

type FieldName = 'user' | 'inviter' | 'invitee';

/**
 * Mark redactable properties in a `{ user: UserLike }` field in an `LogStreamingEventRelay`
 * method arg. These properties will be later redacted by the log streaming
 * destination based on user prefs. Only for `n8n.audit.*` logs.
 *
 * Also transform `id` to `userId` and `role` to `globalRole`.
 *
 * @example
 *
 * { id: '123'; email: 'test@example.com', role: 'some-role' } ->
 * { userId: '123'; _email: 'test@example.com', globalRole: 'some-role' }
 */
export const Redactable =
	(fieldName: FieldName = 'user'): MethodDecorator =>
	(_target, _propertyName, propertyDescriptor: PropertyDescriptor) => {
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		const originalMethod = propertyDescriptor.value as Function;

		type MethodArgs = Array<{ [fieldName: string]: UserLike }>;

		propertyDescriptor.value = function (...args: MethodArgs) {
			const index = args.findIndex((arg) => arg[fieldName] !== undefined);

			if (index === -1) throw new RedactableError(fieldName, args.toString());

			const userLike = args[index]?.[fieldName];

			// @ts-expect-error Transformation
			if (userLike) args[index][fieldName] = toRedactable(userLike);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return originalMethod.apply(this, args);
		};

		return propertyDescriptor;
	};
