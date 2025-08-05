package client

import (
	"fmt"
	"net/http"
	"time"

	"github.com/test/go-nested-packages/pkg/models"
)

// Client represents an HTTP client
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// New creates a new client instance
func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Connect attempts to connect to the server
func (c *Client) Connect() error {
	resp, err := c.httpClient.Get(c.baseURL + "/health")
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unhealthy server: status %d", resp.StatusCode)
	}

	return nil
}

// GetUser fetches a user from the server
func (c *Client) GetUser(userID int) (*models.User, error) {
	url := fmt.Sprintf("%s/users/%d", c.baseURL, userID)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	defer resp.Body.Close()

	// For this example, just return a mock user
	return &models.User{
		ID:    userID,
		Name:  "Fetched User",
		Email: "fetched@example.com",
	}, nil
}

// SetTimeout updates the client timeout
func (c *Client) SetTimeout(timeout time.Duration) {
	c.httpClient.Timeout = timeout
}

// GetBaseURL returns the client's base URL
func (c *Client) GetBaseURL() string {
	return c.baseURL
}
