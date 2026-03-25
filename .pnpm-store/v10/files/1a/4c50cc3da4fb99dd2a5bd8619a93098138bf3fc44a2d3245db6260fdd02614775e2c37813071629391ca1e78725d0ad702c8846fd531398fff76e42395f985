document.addEventListener('DOMContentLoaded', () => {
    log.setDefaultLevel(log.levels.TRACE, false);

    const demoForm = document.getElementById('LogForm');
    const setLevelForm = document.getElementById('SetLevel');
    const setDefaultLevelForm = document.getElementById('SetDefaultLevel');
    const resetLevelButton = document.getElementById('ResetLevelButton');
    const enableAllButton = document.getElementById('EnableAllButton');
    const disableAllButton = document.getElementById('DisableAllButton');

    if (demoForm) {
        demoForm.addEventListener('submit', onSubmitDemoForm);
    }

    if (setLevelForm) {
        setLevelForm.addEventListener('submit', onSubmitSetLevelForm);
    }

    if (setDefaultLevelForm) {
        setDefaultLevelForm.addEventListener('submit', onSubmitSetDefaultLevelForm);
    }

    if (resetLevelButton) {
        resetLevelButton.addEventListener('click', () => {
            log.resetLevel();
            updateLogStateForm();
        });
    }

    if (enableAllButton) {
        enableAllButton.addEventListener('click', () => {
            log.enableAll();
            updateLogStateForm();
        });
    }

    if (disableAllButton) {
        disableAllButton.addEventListener('click', () => {
            log.disableAll();
            updateLogStateForm();
        });
    }

    updateLogStateForm();
});

function onSubmitDemoForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form)
    const debugMessage = formData.get('debugMessage');
    const logLevel = formData.get('logLevel');

    if (debugMessage && logLevel) {
        log[logLevel](debugMessage);
    }
}

function onSubmitSetLevelForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form)
    log.setLevel(parseInt(formData.get('level')), formData.get('persist') === 'true');
    updateLogStateForm();
}

function onSubmitSetDefaultLevelForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form)
    log.setDefaultLevel(parseInt(formData.get('level')));
    updateLogStateForm();
}

function updateLogStateForm() {
    const logState = document.getElementById('LogState');

    if (logState) {
        const currentLevel = logState.querySelector('input[name="currentLevel"]');
        const logLevel = log.getLevel();
        currentLevel.value = Object.keys(log.levels).find(key => log.levels[key] === logLevel);
    }
}
