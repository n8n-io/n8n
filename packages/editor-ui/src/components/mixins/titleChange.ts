type Status = 'EXECUTING' | 'IDLE' | 'ERROR';

export default {
    /**
     * Change title of n8n tab
     * @param workflow Name of workflow
     * @param status Status of workflow
     */
    set (workflow : string, status : Status) {
        document.title = `n8n - ${workflow} - ${status}`;
    },

    reset () {
        document.title = `n8n - Workflow Automation`;
    }
};