# README for Rankia n8n Version

This document provides specific instructions and considerations for deploying and managing the Rankia custom version of n8n.

## Deployment to Google Cloud Run

The primary script for manual deployment to Google Cloud Run is `deploy-cloud-run.sh`.

**CRITICAL: Branch Checkout for Manual Deployment**

The `gcloud builds submit` command used within `deploy-cloud-run.sh` (and potentially other deployment scripts like `deploy-n8n-to-gcp_zero.sh` and `deploy_image_2_cloud.sh`) defaults to using the code from the current working directory. This means **the Git branch currently checked out in your local terminal will be the version built and deployed.**

To ensure you deploy the correct Rankia-specific version:

1.  **Always switch to the `rankia` branch:**
    ```bash
    git checkout rankia
    ```
2.  **Pull the latest changes for the `rankia` branch:**
    ```bash
    git pull origin rankia
    ```
3.  **Only then, run the deployment script:**
    ```bash
    ./deploy-cloud-run.sh
    ```

Failure to do so might result in deploying code from `master` or another feature branch, not the intended Rankia version.

### Recommended Script Modification (for `deploy-cloud-run.sh`)

To make the manual deployment process more robust and prevent accidental deployment from the wrong branch, consider adding the following checks at the beginning of `deploy-cloud-run.sh` (and similar scripts):

```bash
#!/bin/bash
# ... (other initial script content like variables) ...

# --- Start of branch check and update ---
echo_step() { # Define echo_step if not already defined globally in script
  BLUE='\033[1;36m'
  NC='\033[0m' # No Color
  echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

echo_step "Verifying and switching to 'rankia' branch"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "rankia" ]; then
    echo "Currently on branch '$CURRENT_BRANCH'. Switching to 'rankia'..."
    if git checkout rankia; then
        echo "Switched to 'rankia' branch."
    else
        echo "ERROR: Failed to switch to 'rankia' branch. Aborting."
        exit 1
    fi
else
    echo "Already on 'rankia' branch."
fi

echo "Updating 'rankia' branch from remote..."
if git pull origin rankia; then
    echo "'rankia' branch updated successfully."
else
    echo "ERROR: Failed to update 'rankia' branch. Aborting."
    exit 1
fi
# --- End of branch check and update ---

# ... (rest of the deploy-cloud-run.sh script) ...
```
This snippet will:
- Check the current branch.
- Attempt to switch to `rankia` if not already on it.
- Attempt to pull the latest changes for `rankia`.
- Abort the script if any of these steps fail.

## CI/CD Automation

If deployment is automated via a CI/CD system (e.g., Google Cloud Build triggers, GitHub Actions):
- Ensure the CI/CD pipeline configuration is explicitly set to trigger from and use the `rankia` branch for builds and deployments intended for the Rankia version. 