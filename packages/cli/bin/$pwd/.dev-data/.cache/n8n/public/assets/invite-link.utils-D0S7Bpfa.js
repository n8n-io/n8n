//#region src/features/settings/users/invite-link.utils.ts
/**
* Copies a freshly-generated invite link to the clipboard.
*
* The link is passed to `clipboard.copy` as a promise-returning function rather
* than an already-awaited string. vueuse 14+ writes via `navigator.clipboard.write`,
* which accepts a promise that resolves to the value; starting the copy synchronously
* inside the click handler keeps Safari's transient user-activation alive. Awaiting the
* network request first drops it, and Safari (26.5 / 27.0) then silently copies an empty
* string.
*/
async function copyInviteLink(clipboard, usersStore, userId) {
	const invite = usersStore.generateInviteLink({ id: userId });
	await clipboard.copy(async () => {
		return (await invite).link;
	});
}
//#endregion
export { copyInviteLink as t };
