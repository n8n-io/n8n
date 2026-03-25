// Like Bash, we await both subprocesses. This is unlike some other shells which only await the destination subprocess.
// Like Bash with the `pipefail` option, if either subprocess fails, the whole pipe fails.
// Like Bash, if both subprocesses fail, we return the failure of the destination.
// This ensures both subprocesses' errors are present, using `error.pipedFrom`.
export const waitForBothSubprocesses = async subprocessPromises => {
	const [
		{status: sourceStatus, reason: sourceReason, value: sourceResult = sourceReason},
		{status: destinationStatus, reason: destinationReason, value: destinationResult = destinationReason},
	] = await subprocessPromises;

	if (!destinationResult.pipedFrom.includes(sourceResult)) {
		destinationResult.pipedFrom.push(sourceResult);
	}

	if (destinationStatus === 'rejected') {
		throw destinationResult;
	}

	if (sourceStatus === 'rejected') {
		throw sourceResult;
	}

	return destinationResult;
};
