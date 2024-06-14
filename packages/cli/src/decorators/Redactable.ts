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
 * Mark redactable properties in a `UserLike` field in an event bus arg.
 * These properties will be redacted by the log streaming destination
 * if so requested by the user.
 */
export const Redactable =
	(fieldName: FieldName = 'user'): MethodDecorator =>
	(_target, _propertyName, propertyDescriptor: PropertyDescriptor) => {
		const originalMethod = propertyDescriptor.value as Function;

		type MethodArgs = Array<{ [fieldName: string]: UserLike }>;

		propertyDescriptor.value = function (...args: MethodArgs) {
			const index = args.findIndex((arg) => arg[fieldName] !== undefined);

			const userLike = args[index]?.[fieldName];

			// @ts-expect-error Sensitive properties prepended with underscore
			if (userLike) args[index][fieldName] = toRedactable(userLike);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return originalMethod.apply(this, args);
		};

		return propertyDescriptor;
	};
