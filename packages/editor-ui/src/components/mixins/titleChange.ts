type Status = 'EXECUTING' | 'IDLE' | 'ERROR';

export default {
    /**
     * Change title of n8n tab
     * @param workflow Name of workflow
     * @param status Status of workflow
     */
    set (workflow : string, status : Status) {
        if (status === 'EXECUTING') {
            window.document.title = `n8n - 🔄 ${workflow}}`;
        }
        else if (status === 'IDLE') {
            window.document.title = `n8n - ▶️ ${workflow}`;
        }
        else {
            window.document.title = `n8n - ⚠️ ${workflow}`;
        }
       
    },

    reset () {
        document.title = `n8n - Workflow Automation`;
    }
};