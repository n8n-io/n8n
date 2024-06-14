import type { UserLike } from '@/eventbus/audit.types';

function toRedactable(userLike: UserLike) {
	return {
		userId: userLike.id,
		_email: userLike.email,
		_firstName: userLike.firstName,
		_lastName: userLike.lastName,
		globalRole: userLike.role,
	};
}

type FieldName = 'user' | 'inviter' | 'invitee';

/**
 * Mark redactable properties in a `UserLike` field in an `AuditorService`
 * method arg. These properties will be later redacted by the log streaming
 * destination based on user prefs. Relevant only for `n8n.audit.*` logs.
 */
export const Redactable =
	(fieldName: FieldName = 'user'): MethodDecorator =>
	(_target, _propertyName, propertyDescriptor: PropertyDescriptor) => {
		const originalMethod = propertyDescriptor.value as Function;

		type MethodArgs = Array<{ [fieldName: string]: UserLike }>;

		propertyDescriptor.value = function (...args: MethodArgs) {
			const index = args.findIndex((arg) => arg[fieldName] !== undefined);

			const userLike = args[index]?.[fieldName];

			// @ts-expect-error Transformation
			if (userLike) args[index][fieldName] = toRedactable(userLike);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return originalMethod.apply(this, args);
		};

		return propertyDescriptor;
	};
