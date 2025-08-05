package integration

import (
	"fmt"
	"net/http"
	"time"
)

// APIClient represents a client for external API calls
type APIClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewAPIClient creates a new API client
func NewAPIClient(baseURL string) *APIClient {
	return &APIClient{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetUser fetches user data from the API
func (c *APIClient) GetUser(userID string) (string, error) {
	url := fmt.Sprintf("%s/users/%s", c.BaseURL, userID)

	resp, err := c.HTTPClient.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	return fmt.Sprintf("User %s data", userID), nil
}

// PostData sends data to the API
func (c *APIClient) PostData(endpoint string, data []byte) error {
	url := fmt.Sprintf("%s/%s", c.BaseURL, endpoint)

	resp, err := c.HTTPClient.Post(url, "application/json", nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	return nil
}
