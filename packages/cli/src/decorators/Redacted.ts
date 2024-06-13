import type { UserLike } from '@/eventbus/audit.types';

export function redact(userLike: UserLike) {
	delete userLike.email;
	delete userLike.firstName;
	delete userLike.lastName;

	return userLike;
}

type Redactable = 'user' | 'inviter' | 'invitee';

/**
 * Redact sensitive properties in a `UserLike` field in an event bus arg.
 */
export const Redacted =
	(fieldName: Redactable = 'user'): MethodDecorator =>
	(_target, _propertyName, propertyDescriptor: PropertyDescriptor) => {
		const originalMethod = propertyDescriptor.value as Function;

		type MethodArgs = Array<{ [fieldName: string]: UserLike }>;

		propertyDescriptor.value = function (...args: MethodArgs) {
			const index = args.findIndex((arg) => arg[fieldName] !== undefined);

			const userLike = args[index]?.[fieldName];

			if (userLike) args[index][fieldName] = redact(userLike);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return originalMethod.apply(this, args);
		};

		return propertyDescriptor;
	};
